package com.mobilehotspot;

import android.util.Log;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Local HTTP/HTTPS proxy server that runs on the phone.
 *
 * Connected hotspot clients configure this as their proxy. All traffic
 * then flows through the phone's mobile data stack, appearing to the
 * carrier as normal phone browsing rather than tethered traffic.
 *
 * Supports:
 * - HTTP requests (direct forwarding)
 * - HTTPS via CONNECT tunneling (transparent relay)
 */
public class ProxyServer {

    private static final String TAG = "ProxyServer";
    private static final int BUFFER_SIZE = 8192;

    private final int port;
    private ServerSocket serverSocket;
    private ExecutorService threadPool;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final AtomicLong bytesTransferred = new AtomicLong(0);
    private final AtomicLong activeConnections = new AtomicLong(0);

    public ProxyServer(int port) {
        this.port = port;
    }

    /**
     * Start the proxy server on the configured port.
     */
    public void start() throws IOException {
        if (running.get()) {
            Log.w(TAG, "Proxy server already running");
            return;
        }

        serverSocket = new ServerSocket();
        serverSocket.setReuseAddress(true);
        serverSocket.bind(new InetSocketAddress("0.0.0.0", port));
        threadPool = Executors.newCachedThreadPool();
        running.set(true);

        Log.i(TAG, "Proxy server started on port " + port);

        // Accept connections in a background thread
        threadPool.execute(() -> {
            while (running.get()) {
                try {
                    Socket clientSocket = serverSocket.accept();
                    clientSocket.setSoTimeout(30000);
                    activeConnections.incrementAndGet();
                    threadPool.execute(() -> handleClient(clientSocket));
                } catch (IOException e) {
                    if (running.get()) {
                        Log.e(TAG, "Error accepting connection: " + e.getMessage());
                    }
                }
            }
        });
    }

    /**
     * Stop the proxy server.
     */
    public void stop() {
        running.set(false);
        try {
            if (serverSocket != null && !serverSocket.isClosed()) {
                serverSocket.close();
            }
        } catch (IOException e) {
            Log.e(TAG, "Error closing server socket: " + e.getMessage());
        }
        if (threadPool != null) {
            threadPool.shutdownNow();
        }
        Log.i(TAG, "Proxy server stopped");
    }

    public boolean isRunning() {
        return running.get();
    }

    public long getBytesTransferred() {
        return bytesTransferred.get();
    }

    public long getActiveConnections() {
        return activeConnections.get();
    }

    public int getPort() {
        return port;
    }

    /**
     * Handle an incoming client connection.
     * Parses the first line to determine if it's a CONNECT (HTTPS) or regular HTTP request.
     */
    private void handleClient(Socket clientSocket) {
        try {
            InputStream clientIn = clientSocket.getInputStream();
            OutputStream clientOut = clientSocket.getOutputStream();

            // Read the first line of the request
            String requestLine = readLine(clientIn);
            if (requestLine == null || requestLine.isEmpty()) {
                clientSocket.close();
                return;
            }

            Log.d(TAG, "Request: " + requestLine);

            if (requestLine.startsWith("CONNECT ")) {
                handleConnect(requestLine, clientIn, clientOut, clientSocket);
            } else {
                handleHttp(requestLine, clientIn, clientOut, clientSocket);
            }
        } catch (IOException e) {
            Log.d(TAG, "Client connection error: " + e.getMessage());
        } finally {
            activeConnections.decrementAndGet();
            try {
                clientSocket.close();
            } catch (IOException ignored) {}
        }
    }

    /**
     * Handle HTTPS CONNECT tunneling.
     * Creates a transparent TCP relay between the client and destination.
     */
    private void handleConnect(String requestLine, InputStream clientIn,
                                OutputStream clientOut, Socket clientSocket) throws IOException {
        // Parse "CONNECT host:port HTTP/1.1"
        String[] parts = requestLine.split(" ");
        if (parts.length < 2) return;

        String[] hostPort = parts[1].split(":");
        String host = hostPort[0];
        int remotePort = hostPort.length > 1 ? Integer.parseInt(hostPort[1]) : 443;

        // Read and discard remaining headers
        String line;
        while ((line = readLine(clientIn)) != null && !line.isEmpty()) {
            // consume headers
        }

        // Connect to the remote server
        Socket remoteSocket = new Socket();
        try {
            remoteSocket.connect(new InetSocketAddress(host, remotePort), 10000);
            remoteSocket.setSoTimeout(30000);
        } catch (IOException e) {
            String errorResponse = "HTTP/1.1 502 Bad Gateway\r\n\r\n";
            clientOut.write(errorResponse.getBytes());
            clientOut.flush();
            return;
        }

        // Send 200 Connection Established to the client
        String response = "HTTP/1.1 200 Connection Established\r\n\r\n";
        clientOut.write(response.getBytes());
        clientOut.flush();

        // Relay data bidirectionally
        InputStream remoteIn = remoteSocket.getInputStream();
        OutputStream remoteOut = remoteSocket.getOutputStream();

        Thread toRemote = new Thread(() -> relay(clientIn, remoteOut));
        Thread toClient = new Thread(() -> relay(remoteIn, clientOut));

        toRemote.start();
        toClient.start();

        try {
            toRemote.join();
            toClient.join();
        } catch (InterruptedException ignored) {}

        remoteSocket.close();
    }

    /**
     * Handle a plain HTTP request by forwarding it to the destination.
     */
    private void handleHttp(String requestLine, InputStream clientIn,
                             OutputStream clientOut, Socket clientSocket) throws IOException {
        // Parse "GET http://host:port/path HTTP/1.1"
        String[] parts = requestLine.split(" ");
        if (parts.length < 3) return;

        String method = parts[0];
        String urlStr = parts[1];
        String httpVersion = parts[2];

        URL url;
        try {
            url = new URL(urlStr);
        } catch (Exception e) {
            String errorResponse = "HTTP/1.1 400 Bad Request\r\n\r\n";
            clientOut.write(errorResponse.getBytes());
            clientOut.flush();
            return;
        }

        String host = url.getHost();
        int remotePort = url.getPort() != -1 ? url.getPort() : 80;
        String path = url.getFile().isEmpty() ? "/" : url.getFile();

        // Read the remaining request headers
        StringBuilder headers = new StringBuilder();
        String line;
        int contentLength = 0;
        while ((line = readLine(clientIn)) != null && !line.isEmpty()) {
            if (line.toLowerCase().startsWith("proxy-connection:")) {
                continue; // Skip proxy-specific headers
            }
            if (line.toLowerCase().startsWith("content-length:")) {
                contentLength = Integer.parseInt(line.split(":")[1].trim());
            }
            headers.append(line).append("\r\n");
        }

        // Connect to remote server
        Socket remoteSocket = new Socket();
        try {
            remoteSocket.connect(new InetSocketAddress(host, remotePort), 10000);
            remoteSocket.setSoTimeout(30000);
        } catch (IOException e) {
            String errorResponse = "HTTP/1.1 502 Bad Gateway\r\n\r\n";
            clientOut.write(errorResponse.getBytes());
            clientOut.flush();
            return;
        }

        OutputStream remoteOut = remoteSocket.getOutputStream();
        InputStream remoteIn = remoteSocket.getInputStream();

        // Forward the request with a relative path (not absolute URL)
        String forwardedRequest = method + " " + path + " " + httpVersion + "\r\n";
        remoteOut.write(forwardedRequest.getBytes());
        remoteOut.write(headers.toString().getBytes());
        remoteOut.write("\r\n".getBytes());

        // Forward request body if present
        if (contentLength > 0) {
            byte[] body = new byte[contentLength];
            int read = 0;
            while (read < contentLength) {
                int r = clientIn.read(body, read, contentLength - read);
                if (r == -1) break;
                read += r;
            }
            remoteOut.write(body, 0, read);
        }
        remoteOut.flush();

        // Relay the response back to the client
        relay(remoteIn, clientOut);

        remoteSocket.close();
    }

    /**
     * Relay data from input to output stream until one side closes.
     */
    private void relay(InputStream in, OutputStream out) {
        byte[] buffer = new byte[BUFFER_SIZE];
        try {
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
                out.flush();
                bytesTransferred.addAndGet(bytesRead);
            }
        } catch (IOException ignored) {
            // Connection closed
        }
    }

    /**
     * Read a single line (terminated by \r\n or \n) from the input stream.
     */
    private String readLine(InputStream in) throws IOException {
        StringBuilder sb = new StringBuilder();
        int c;
        while ((c = in.read()) != -1) {
            if (c == '\n') {
                break;
            }
            if (c != '\r') {
                sb.append((char) c);
            }
        }
        if (c == -1 && sb.length() == 0) return null;
        return sb.toString();
    }
}
