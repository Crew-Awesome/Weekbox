package com.crewawesome.weekbox;

import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import com.github.junrar.Junrar;
import org.apache.commons.compress.archivers.sevenz.SevenZArchiveEntry;
import org.apache.commons.compress.archivers.sevenz.SevenZFile;

@CapacitorPlugin(name = "ModFileManager")
public class ModFileManagerPlugin extends Plugin {

    private final ExecutorService executor = Executors.newFixedThreadPool(3);
    private final Set<String> cancelledTasks = Collections.newSetFromMap(new ConcurrentHashMap<String, Boolean>());

    @Override
    protected void handleOnDestroy() {
        executor.shutdownNow();
        super.handleOnDestroy();
    }

    @PluginMethod
    public void getModsPath(PluginCall call) {
        File modsDir = getContext().getExternalFilesDir("mods");
        if (modsDir == null) {
            modsDir = new File(getContext().getFilesDir(), "mods");
        }
        if (!modsDir.exists()) {
            modsDir.mkdirs();
        }
        JSObject ret = new JSObject();
        ret.put("path", modsDir.getAbsolutePath());
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        String taskId = call.getString("taskId");
        if (taskId != null) {
            cancelledTasks.add(taskId);
        }
        call.resolve();
    }

    @PluginMethod
    public void deleteModFolder(PluginCall call) {
        String modId = call.getString("modId");
        String folderPath = call.getString("folderPath");

        File target = null;
        if (folderPath != null && !folderPath.isEmpty()) {
            target = new File(folderPath);
        } else if (modId != null && !modId.isEmpty()) {
            File modsDir = getContext().getExternalFilesDir("mods");
            if (modsDir != null && modsDir.exists()) {
                File[] list = modsDir.listFiles();
                if (list != null) {
                    for (File f : list) {
                        if (f.getName().startsWith("mod_" + modId + "_") || f.getName().equals(modId)) {
                            target = f;
                            break;
                        }
                    }
                }
            }
        }

        if (target != null && target.exists()) {
            deleteRecursively(target);
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } else {
            JSObject res = new JSObject();
            res.put("success", false);
            res.put("message", "Folder not found");
            call.resolve(res);
        }
    }

    @PluginMethod
    public void openFolder(PluginCall call) {
        String path = call.getString("path");
        File folder = (path != null && !path.isEmpty()) ? new File(path) : getContext().getExternalFilesDir("mods");
        if (folder == null) {
            folder = new File(getContext().getFilesDir(), "mods");
        }
        if (!folder.exists()) {
            folder.mkdirs();
        }

        try {
            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                folder
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "*/*");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
            return;
        } catch (Exception ignored) {}

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(Uri.parse(folder.getAbsolutePath()), "resource/folder");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
            return;
        } catch (Exception ignored) {}

        JSObject res = new JSObject();
        res.put("fallbackPath", folder.getAbsolutePath());
        call.resolve(res);
    }

    @PluginMethod
    public void downloadAndExtractMod(PluginCall call) {
        String urlStr = call.getString("url");
        String modId = call.getString("modId", String.valueOf(System.currentTimeMillis()));
        String modName = call.getString("modName", "unknown");
        String taskId = call.getString("taskId", "task_" + System.currentTimeMillis());

        if (urlStr == null || urlStr.isEmpty()) {
            call.reject("URL must be provided");
            return;
        }

        cancelledTasks.remove(taskId);

        executor.execute(() -> {
            File modsDir = getContext().getExternalFilesDir("mods");
            if (modsDir == null) {
                modsDir = new File(getContext().getFilesDir(), "mods");
            }
            if (!modsDir.exists()) {
                modsDir.mkdirs();
            }

            String safeName = modName.toLowerCase().replaceAll("[^a-z0-9]", "");
            File targetFolder = new File(modsDir, "mod_" + modId + "_" + safeName);
            File tempArchive = new File(modsDir, "_temp_" + modId + "_" + taskId + ".bin");

            try {
                // 1. Download file with progress reporting
                emitProgress(taskId, 0, "Starting...", 0, 0, null);
                boolean downloaded = downloadFileWithRedirects(urlStr, tempArchive, taskId);

                if (!downloaded || isCancelled(taskId)) {
                    cleanupFile(tempArchive);
                    deleteRecursively(targetFolder);
                    call.reject("Download cancelled or failed");
                    return;
                }

                // 2. Extract archive (ZIP, RAR, or 7Z)
                emitProgress(taskId, 99, "Extracting archive...", 0, 0, null);
                if (targetFolder.exists()) {
                    deleteRecursively(targetFolder);
                }
                targetFolder.mkdirs();

                extractArchive(tempArchive, targetFolder, taskId, urlStr);
                cleanupFile(tempArchive);

                if (isCancelled(taskId)) {
                    deleteRecursively(targetFolder);
                    call.reject("Download cancelled during extraction");
                    return;
                }

                // 3. Flatten folder structure if archive contains single wrapper directory
                emitProgress(taskId, 99, "Flattening folder structure...", 0, 0, null);
                flattenDirectory(targetFolder);

                // 4. Completed
                emitProgress(taskId, 100, "Completed", 0, 0, null);

                JSObject result = new JSObject();
                result.put("success", true);
                result.put("installPath", targetFolder.getAbsolutePath());
                result.put("modId", modId);
                call.resolve(result);

            } catch (Exception e) {
                cleanupFile(tempArchive);
                deleteRecursively(targetFolder);
                call.reject("Failed to download or extract mod: " + e.getMessage(), e);
            } finally {
                cancelledTasks.remove(taskId);
            }
        });
    }

    private boolean isCancelled(String taskId) {
        return cancelledTasks.contains(taskId);
    }

    private void emitProgress(String taskId, int percent, String status, long downloaded, long total, String currentFile) {
        JSObject data = new JSObject();
        data.put("taskId", taskId);
        data.put("progressId", taskId);
        data.put("percent", percent);
        data.put("status", status);
        data.put("downloaded", downloaded);
        data.put("total", total);
        if (currentFile != null) {
            data.put("currentFile", currentFile);
        }
        notifyListeners("downloadProgress", data);
    }

    private boolean downloadFileWithRedirects(String initialUrl, File destFile, String taskId) throws IOException {
        String currentUrl = initialUrl;
        int redirectCount = 0;
        HttpURLConnection conn = null;

        while (redirectCount < 10) {
            if (isCancelled(taskId)) return false;

            URL url = new URL(currentUrl);
            conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(true);
            conn.setRequestProperty("User-Agent", "WeekBox-Android/1.0");
            conn.setConnectTimeout(25000);
            conn.setReadTimeout(35000);

            int status = conn.getResponseCode();
            if (status == HttpURLConnection.HTTP_MOVED_TEMP ||
                status == HttpURLConnection.HTTP_MOVED_PERM ||
                status == HttpURLConnection.HTTP_SEE_OTHER ||
                status == 307 || status == 308) {
                String newUrl = conn.getHeaderField("Location");
                if (newUrl != null && !newUrl.isEmpty()) {
                    currentUrl = newUrl;
                    redirectCount++;
                    conn.disconnect();
                    continue;
                }
            }

            if (status != HttpURLConnection.HTTP_OK) {
                throw new IOException("Server returned HTTP " + status);
            }
            break;
        }

        if (conn == null) {
            throw new IOException("Could not connect to URL");
        }

        long totalBytes = conn.getContentLengthLong();
        long downloadedBytes = 0;

        try (InputStream in = new BufferedInputStream(conn.getInputStream());
             OutputStream out = new FileOutputStream(destFile)) {

            byte[] buffer = new byte[32768];
            int read;
            long lastNotificationTime = 0;

            while ((read = in.read(buffer)) != -1) {
                if (isCancelled(taskId)) {
                    return false;
                }
                out.write(buffer, 0, read);
                downloadedBytes += read;

                long now = System.currentTimeMillis();
                if (now - lastNotificationTime >= 120) {
                    lastNotificationTime = now;
                    int percent = totalBytes > 0
                        ? (int) Math.min(98, (downloadedBytes * 98L) / totalBytes)
                        : (int) Math.min(98, downloadedBytes / (1024 * 1024));
                    emitProgress(taskId, percent, "Downloading...", downloadedBytes, totalBytes, null);
                }
            }
            out.flush();
        } finally {
            conn.disconnect();
        }

        return true;
    }

    private String detectArchiveType(File file, String url) {
        if (file != null && file.exists() && file.length() >= 6) {
            try (FileInputStream fis = new FileInputStream(file)) {
                byte[] header = new byte[8];
                int read = fis.read(header);
                if (read >= 6) {
                    // 7z: 37 7A BC AF 27 1C
                    if (header[0] == 0x37 && header[1] == 0x7A &&
                        (header[2] & 0xFF) == 0xBC && (header[3] & 0xFF) == 0xAF &&
                        (header[4] & 0xFF) == 0x27 && (header[5] & 0xFF) == 0x1C) {
                        return "7z";
                    }
                    // RAR: 52 61 72 21 1A 07
                    if (header[0] == 0x52 && header[1] == 0x61 && header[2] == 0x72 &&
                        header[3] == 0x21 && header[4] == 0x1A && header[5] == 0x07) {
                        return "rar";
                    }
                }
                if (read >= 4) {
                    // ZIP: PK (0x50 0x4B)
                    if (header[0] == 0x50 && header[1] == 0x4B) {
                        return "zip";
                    }
                }
            } catch (Exception ignored) {}
        }

        if (url != null) {
            String lower = url.toLowerCase();
            if (lower.contains(".7z")) return "7z";
            if (lower.contains(".rar")) return "rar";
            if (lower.contains(".zip")) return "zip";
        }

        return "zip";
    }

    private void extractArchive(File archiveFile, File destDir, String taskId, String url) throws Exception {
        String type = detectArchiveType(archiveFile, url);
        emitProgress(taskId, 99, "Extracting " + type.toUpperCase() + " archive...", 0, 0, null);

        if ("rar".equalsIgnoreCase(type)) {
            unrar(archiveFile, destDir, taskId);
        } else if ("7z".equalsIgnoreCase(type)) {
            un7z(archiveFile, destDir, taskId);
        } else {
            unzip(archiveFile, destDir, taskId);
        }
    }

    private void unrar(File rarFile, File destDir, String taskId) throws Exception {
        Junrar.extract(rarFile, destDir);
    }

    private void un7z(File sevenZFile, File destDir, String taskId) throws IOException {
        byte[] buffer = new byte[32768];
        String destCanonicalPath = destDir.getCanonicalPath();
        long lastNotify = 0;

        try (SevenZFile sz = new SevenZFile(sevenZFile)) {
            SevenZArchiveEntry entry;
            while ((entry = sz.getNextEntry()) != null) {
                if (isCancelled(taskId)) {
                    return;
                }

                String entryName = entry.getName();
                File newFile = new File(destDir, entryName);
                String newFileCanonicalPath = newFile.getCanonicalPath();

                // Zip Slip security verification
                if (!newFileCanonicalPath.startsWith(destCanonicalPath + File.separator) && !newFileCanonicalPath.equals(destCanonicalPath)) {
                    throw new IOException("7z entry is outside of target directory: " + entryName);
                }

                long now = System.currentTimeMillis();
                if (now - lastNotify >= 150) {
                    lastNotify = now;
                    emitProgress(taskId, 99, "Extracting archive...", 0, 0, entryName);
                }

                if (entry.isDirectory()) {
                    newFile.mkdirs();
                } else {
                    File parent = newFile.getParentFile();
                    if (parent != null && !parent.exists()) {
                        parent.mkdirs();
                    }
                    try (FileOutputStream fos = new FileOutputStream(newFile)) {
                        int len;
                        while ((len = sz.read(buffer, 0, buffer.length)) != -1) {
                            fos.write(buffer, 0, len);
                        }
                    }
                }
            }
        }
    }

    private void unzip(File zipFile, File destDir, String taskId) throws IOException {
        byte[] buffer = new byte[32768];
        String destCanonicalPath = destDir.getCanonicalPath();

        try (ZipInputStream zis = new ZipInputStream(new FileInputStream(zipFile))) {
            ZipEntry entry = zis.getNextEntry();
            long lastNotify = 0;

            while (entry != null) {
                if (isCancelled(taskId)) {
                    return;
                }

                File newFile = new File(destDir, entry.getName());
                String newFileCanonicalPath = newFile.getCanonicalPath();

                // Zip Slip security verification
                if (!newFileCanonicalPath.startsWith(destCanonicalPath + File.separator) && !newFileCanonicalPath.equals(destCanonicalPath)) {
                    throw new IOException("Zip entry is outside of target directory: " + entry.getName());
                }

                long now = System.currentTimeMillis();
                if (now - lastNotify >= 150) {
                    lastNotify = now;
                    emitProgress(taskId, 99, "Extracting archive...", 0, 0, entry.getName());
                }

                if (entry.isDirectory()) {
                    newFile.mkdirs();
                } else {
                    File parent = newFile.getParentFile();
                    if (parent != null && !parent.exists()) {
                        parent.mkdirs();
                    }
                    try (FileOutputStream fos = new FileOutputStream(newFile)) {
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            fos.write(buffer, 0, len);
                        }
                    }
                }
                zis.closeEntry();
                entry = zis.getNextEntry();
            }
        }
    }

    private void flattenDirectory(File folder) {
        if (!folder.exists() || !folder.isDirectory()) return;

        File[] files = folder.listFiles();
        if (files == null || files.length == 0) return;

        File singleSubDir = null;
        for (File f : files) {
            if (f.isDirectory()) {
                if (singleSubDir == null) {
                    singleSubDir = f;
                } else {
                    return;
                }
            } else {
                String name = f.getName().toLowerCase();
                if (!name.equals("thumbs.db") && !name.equals(".ds_store")) {
                    return;
                }
            }
        }

        if (singleSubDir != null && singleSubDir.exists() && singleSubDir.isDirectory()) {
            File[] subFiles = singleSubDir.listFiles();
            if (subFiles != null) {
                for (File sf : subFiles) {
                    File dest = new File(folder, sf.getName());
                    sf.renameTo(dest);
                }
            }
            singleSubDir.delete();
        }
    }

    private void deleteRecursively(File fileOrDir) {
        if (fileOrDir == null || !fileOrDir.exists()) return;
        if (fileOrDir.isDirectory()) {
            File[] children = fileOrDir.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursively(child);
                }
            }
        }
        fileOrDir.delete();
    }

    private void cleanupFile(File file) {
        if (file != null && file.exists()) {
            try {
                file.delete();
            } catch (Exception ignored) {}
        }
    }
}
