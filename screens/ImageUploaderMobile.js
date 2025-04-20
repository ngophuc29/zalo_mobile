import React, { useState } from 'react';
import { View, Button, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const ImageUploaderMobile = ({ onUploadSuccess }) => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Cần cấp quyền', 'Ứng dụng cần quyền truy cập thư viện ảnh');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            setSelectedImage(result.assets[0].uri);
        }
    };
    const handleUpload = async () => {
        if (!selectedImage) {
            Alert.alert('Chưa chọn ảnh', 'Vui lòng chọn ảnh trước khi tải lên');
            return;
        }
        setUploading(true);

        try {
            let fileData, fileName, fileType;
            if (Platform.OS === 'web') {
                // Web: fetch blob, append blob vào FormData
                const resp = await fetch(selectedImage);
                const blob = await resp.blob();
                fileType = blob.type;
                const ext = fileType.split('/').pop();
                fileName = `photo_${Date.now()}.${ext}`;
                fileData = blob;
            } else {
                // Mobile: kiểm tra tồn tại file rồi dùng uri trực tiếp
                const info = await FileSystem.getInfoAsync(selectedImage);
                if (!info.exists) throw new Error('File không tồn tại');
                fileType = 'image/jpeg';
                fileName = `photo_${Date.now()}.jpg`;
                fileData = { uri: selectedImage, name: fileName, type: fileType };
            }

            const formData = new FormData();
            // Web: formData.append(name, blob, filename)
            formData.append('file', fileData, fileName);
            formData.append('upload_preset', 'unsigned_upload');
            formData.append('cloud_name', 'dxm8pqql5');

            // Chỉ set Content-Type trên Mobile
            const headers = { Accept: 'application/json' };
            if (Platform.OS !== 'web') {
                headers['Content-Type'] = 'multipart/form-data';
            }

            const res = await fetch(
                'https://api.cloudinary.com/v1_1/dxm8pqql5/image/upload',
                {
                    method: 'POST',
                    body: formData,
                    headers,
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'Upload thất bại');

            Alert.alert('Thành công', 'Ảnh đã được tải lên!');
            onUploadSuccess(data.secure_url);
        } catch (err) {
            console.error('Lỗi upload:', err);
            Alert.alert('Lỗi', err.message);
        } finally {
            setUploading(false);
        }
    };


    return (
        <View style={{ padding: 20 }}>
            <Button title="Chọn ảnh từ thư viện" onPress={pickImage} />

            {selectedImage && (
                <Image
                    source={{ uri: selectedImage }}
                    style={{
                        width: 200,
                        height: 200,
                        marginVertical: 15,
                        borderRadius: 5,
                    }}
                />
            )}

            {selectedImage && (
                uploading ? (
                    <ActivityIndicator size="large" color="#0000ff" />
                ) : (
                    <Button
                        title="Tải ảnh lên Cloudinary"
                        onPress={handleUpload}
                        color="#4CAF50"
                    />
                )
            )}
        </View>
    );
};

export default ImageUploaderMobile;
