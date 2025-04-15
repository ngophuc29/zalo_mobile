import React, { useState } from 'react';
import { View, Button, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

const FileUploaderMobile = ({ onUploadSuccess, fileTypes }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const pickFile = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: fileTypes || '*/*',
        });
        if (result.type === "success") {
            // Kiểm tra kích thước file (ở đây giới hạn 20MB)
            if (result.size && result.size > 20 * 1024 * 1024) {
                setError("File không được vượt quá 20MB");
                return;
            }
            setSelectedFile(result);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", {
            uri: selectedFile.uri,
            type: selectedFile.mimeType || 'application/octet-stream',
            name: selectedFile.name,
        });
        formData.append("upload_preset", "unsigned_upload");

        // Xác định resourceType và endpoint theo kiểu file
        let resourceType = "auto";
        let endpoint = "auto/upload";

        if (selectedFile.mimeType && selectedFile.mimeType.startsWith("image/")) {
            resourceType = "image";
            endpoint = "image/upload";
        } else if (selectedFile.mimeType && selectedFile.mimeType.startsWith("video/")) {
            resourceType = "video";
            endpoint = "video/upload";
        } else {
            resourceType = "raw";
            endpoint = "raw/upload";
        }

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/dxm8pqql5/${endpoint}`, {
                method: "POST",
                body: formData,
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            const data = await res.json();
            if (data.secure_url) {
                onUploadSuccess({
                    url: data.secure_url,
                    type: resourceType,
                    name: selectedFile.name,
                    size: data.bytes,
                    publicId: data.public_id,
                    resourceType: resourceType,
                    fileType: resourceType,
                    ...(data.width && { width: data.width }),
                    ...(data.height && { height: data.height }),
                    ...(data.duration && { duration: data.duration }),
                    ...(data.eager && data.eager[0] && { thumbnail: data.eager[0].secure_url }),
                });
            } else {
                setError("Upload không thành công: " + (data.error?.message || "Lỗi không xác định"));
            }
        } catch (err) {
            setError("Lỗi khi upload: " + err.message);
        } finally {
            setUploading(false);
            setSelectedFile(null);
        }
    };

    return (
        <View style={styles.container}>
            <Button title="Chọn file" onPress={pickFile} />
            {selectedFile && (
                <View style={styles.fileInfo}>
                    <Text>File đã chọn: {selectedFile.name}</Text>
                    <Text>Kích thước: {selectedFile.size ? selectedFile.size : 'Unknown'}</Text>
                </View>
            )}
            {error && <Text style={{ color: "red" }}>{error}</Text>}
            {uploading ? (
                <ActivityIndicator size="large" />
            ) : (
                <Button title="Tải file lên" onPress={handleUpload} disabled={!selectedFile} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { padding: 10, borderWidth: 1, borderColor: "#ccc", borderRadius: 8 },
    fileInfo: { marginBottom: 10 },
});

export default FileUploaderMobile;
