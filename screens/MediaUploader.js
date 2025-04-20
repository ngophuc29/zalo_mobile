// MediaUploaderMobile.js
import React, { useState } from 'react';
import {
    View,
    Text,
    Button,
    ActivityIndicator,
    Alert,
    StyleSheet,
    Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dxm8pqql5';
const UPLOAD_PRESET = 'unsigned_upload';

export default function MediaUploaderMobile({ onUploadSuccess, onCancel }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const pickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['*/*'],
                copyToCacheDirectory: true,
            });
            if (result.type !== 'success') return;

            // Lấy kích thước chính xác nếu result.size bằng null
            let size = result.size;
            if (!size) {
                const info = await FileSystem.getInfoAsync(result.uri);
                size = info.size;
            }

            if (size > 20 * 1024 * 1024) {
                Alert.alert('Lỗi', 'File không được vượt quá 20MB');
                return;
            }

            setFile({
                uri: result.uri,
                name: result.name,
                type: result.mimeType || 'application/octet-stream',
                size,
            });
        } catch (err) {
            Alert.alert('Lỗi khi chọn file', err.message);
        }
    };

    const uploadFile = async () => {
        if (!file) {
            Alert.alert('Chưa chọn file');
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', {
                uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
                name: file.name,
                type: file.type,
            });
            formData.append('upload_preset', UPLOAD_PRESET);

            // Chọn endpoint raw hay video
            const resource = file.type.startsWith('video/') ? 'video' : 'raw';

            const res = await fetch(`${CLOUDINARY_URL}/${resource}/upload`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (data.secure_url) {
                onUploadSuccess({
                    url: data.secure_url,
                    type: resource,
                    name: file.name,
                    size: file.size,
                    publicId: data.public_id,
                });
                setFile(null);
            } else {
                throw new Error(data.error?.message || 'Upload thất bại');
            }
        } catch (err) {
            Alert.alert('Lỗi khi upload', err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Button title="Chọn file (pdf, word, video…)" onPress={pickFile} disabled={uploading} />
            {file && (
                <View style={styles.info}>
                    <Text>Tên: {file.name}</Text>
                    <Text>Kích thước: {(file.size / (1024 * 1024)).toFixed(2)} MB</Text>
                    <Button
                        title={uploading ? 'Đang tải lên...' : 'Tải lên Cloudinary'}
                        onPress={uploadFile}
                        disabled={uploading}
                    />
                </View>
            )}
            <Button title="Hủy" onPress={onCancel} disabled={uploading} color="#ff4444" />
            {uploading && <ActivityIndicator style={{ marginTop: 10 }} size="large" />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 8,
        width: '90%',
    },
    info: {
        marginVertical: 16,
    },
});
