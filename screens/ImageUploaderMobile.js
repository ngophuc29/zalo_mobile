import React, { useState } from 'react';
import { View, Button, Image, ActivityIndicator, StyleSheet, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const ImageUploaderMobile = ({ onUploadSuccess }) => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Yêu cầu quyền truy cập thư viện ảnh
    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            alert("Bạn cần cấp quyền truy cập thư viện ảnh!");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });
        if (!result.cancelled) {
            setSelectedImage(result.uri);
        }
    };

    const handleUpload = async () => {
        if (!selectedImage) return;
        setUploading(true);

        const formData = new FormData();
        formData.append("file", {
            uri: selectedImage,
            type: 'image/jpeg', // hoặc lấy MIME type từ kết quả nếu có
            name: 'upload.jpg',
        });
        formData.append("upload_preset", "unsigned_upload");
        formData.append("cloud_name", "dxm8pqql5");

        try {
            const res = await fetch("https://api.cloudinary.com/v1_1/dxm8pqql5/image/upload", {
                method: "POST",
                body: formData,
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            const data = await res.json();
            if (data.secure_url) {
                onUploadSuccess(data.secure_url);
            } else {
                console.error("Upload error:", data);
            }
        } catch (err) {
            console.error("Error during upload:", err);
        } finally {
            setUploading(false);
            setSelectedImage(null);
        }
    };

    return (
        <View style={styles.container}>
            <Button title="Chọn ảnh" onPress={pickImage} />
            {selectedImage && (
                <Image source={{ uri: selectedImage }} style={styles.image} />
            )}
            {uploading ? (
                <ActivityIndicator size="large" />
            ) : (
                <Button title="Tải ảnh lên" onPress={handleUpload} disabled={!selectedImage} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { padding: 10 },
    image: { width: 200, height: 200, marginVertical: 10 },
});

export default ImageUploaderMobile;
