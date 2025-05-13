// File: FileUploaderMobile.js

import React, { useState } from 'react';
import {
    View,
    Text,
    Button,
    Image,
    ActivityIndicator,
    Alert,
    StyleSheet,
    Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dxm8pqql5';
const UPLOAD_PRESET = 'unsigned_upload';

export default function FileUploader({ onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    // 1. Chọn file
    const pickFile = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });
            // res.assets là mảng; fallback về res nếu dạng cũ
            const picked = res.assets?.[0] ?? (res.type === 'success' ? res : null);
            if (!picked) return;
            if (picked.size > 20 * 1024 * 1024) {
                Alert.alert('Lỗi', 'File vượt quá 20MB');
                return;
            }
            setFile(picked);
            setError('');
        } catch (e) {
            console.error(e);
            Alert.alert('Lỗi', 'Không thể chọn file');
        }
    };

    // 2. Map extension → mimeType
    const getMimeType = (name) => {
        const ext = name.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext))
            return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext))
            return `video/${ext}`;
        if (ext === 'pdf') return 'application/pdf';
        if (['doc', 'docx'].includes(ext))
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (['xls', 'xlsx'].includes(ext))
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (['ppt', 'pptx'].includes(ext))
            return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        return 'application/octet-stream';
    };

    // 3. Label fileType cho callback
    const getFileTypeLabel = (mimeType) => {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType === 'application/pdf') return 'pdf';
        if (mimeType.includes('wordprocessingml')) return 'word';
        if (mimeType.includes('spreadsheetml')) return 'excel';
        if (mimeType.includes('presentationml')) return 'powerpoint';
        return 'other';
    };

    // 4. Upload lên Cloudinary
    const handleUpload = async () => {
        if (!file) {
            Alert.alert('Lỗi', 'Chưa chọn file để tải lên!');
            return;
        }
        setUploading(true);
        setError('');

        const mimeType = getMimeType(file.name);
        let resourceType = 'raw';
        let endpoint = 'raw/upload';
        if (mimeType.startsWith('image/')) {
            resourceType = 'image';
            endpoint = 'image/upload';
        } else if (mimeType.startsWith('video/')) {
            resourceType = 'video';
            endpoint = 'video/upload';
        }

        try {
            // 4.1. Đọc file thành Blob
            const uri = Platform.OS === 'ios'
                ? file.uri.replace('file://', '')
                : file.uri;
            const fileResponse = await fetch(uri);
            const blob = await fileResponse.blob();

            // 4.2. Tạo FormData
            const formData = new FormData();
            formData.append('file', blob, file.name);
            formData.append('upload_preset', UPLOAD_PRESET);

            // 4.3. Gửi request
            const res = await fetch(`${CLOUDINARY_URL}/${endpoint}`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
          
            if (data.secure_url) {
                onUploadSuccess?.({
                    url: data.secure_url,
                    name: file.name,
                    type: getFileTypeLabel(mimeType),
                    size: data.bytes,
                    publicId: data.public_id,
                    resourceType,
                    ...(data.width && { width: data.width }),
                    ...(data.height && { height: data.height }),
                    ...(data.duration && { duration: data.duration }),
                    ...(data.eager?.[0] && { thumbnail: data.eager[0].secure_url }),
                });
                Alert.alert('Thành công', 'Tải file lên thành công!');
                setFile(null);
            } else {
                console.warn('Upload failed', data);
                throw new Error(data.error?.message || 'Unknown error');
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message);
            Alert.alert('Lỗi', err.message || 'Không thể upload file');
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Button title="Chọn file" onPress={pickFile} />

            {file && (
                <View style={styles.preview}>
                    <Text style={styles.text}>
                        <Text style={styles.bold}>Tên:</Text> {file.name}
                    </Text>
                    <Text style={styles.text}>
                        <Text style={styles.bold}>Kích thước:</Text>{' '}
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </Text>

                    {getMimeType(file.name).startsWith('image/') && (
                        <Image
                            source={{ uri: file.uri }}
                            style={styles.image}
                            resizeMode="contain"
                        />
                    )}

                    <Button
                        title={uploading ? 'Đang tải lên...' : 'Tải lên Cloudinary'}
                        onPress={handleUpload}
                        disabled={uploading}
                    />
                    {uploading && <ActivityIndicator style={{ marginTop: 10 }} />}
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
    },
    preview: {
        marginTop: 12,
    },
    text: {
        marginBottom: 4,
    },
    bold: {
        fontWeight: 'bold',
    },
    image: {
        width: 150,
        height: 150,
        marginVertical: 10,
        borderRadius: 8,
    },
    error: {
        color: 'red',
        marginTop: 8,
    },
});
