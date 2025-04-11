// RegisterStep2Screen.js
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';
// Nếu sử dụng react-native-image-picker, import thư viện tại đây.

const RegisterStep2Screen = () => {
    const route = useRoute();
    const { email } = route.params || {};
    const navigation = useNavigation();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullname, setFullname] = useState('');
    const [phone, setPhone] = useState('');
    const [birthday, setBirthday] = useState('');
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);

    // Ví dụ giả lập chọn ảnh (bạn cần tích hợp thư viện image picker để chọn ảnh từ thiết bị)
    const handleSelectImage = () => {
        // Đây chỉ là ví dụ; thay thế bằng hàm từ image picker
        // Ví dụ: sử dụng launchImageLibrary từ react-native-image-picker
        // Sau khi chọn ảnh, setImage(fileUri)
        alert('Chọn ảnh', 'Tích hợp image picker ở đây');
    };

    const handleRegisterStep2 = async () => {
        if (!username || !password || !fullname || !phone) {
            alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin bắt buộc');
            return;
        }
        setLoading(true);
        try {
            const apiUrl = 'http://localhost:5000/api';
            const response = await axios.post(`${apiUrl}/accounts/register-step2`, {
                username,
                password,
                phone,
                email,
                birthday,
                fullname,
                image, // image có thể là URI hoặc dữ liệu base64 tùy theo backend yêu cầu
            });
            if (response.status === 201) {
                alert('Thành công', 'Đăng ký thành công!');
                navigation.navigate('Login');
            }
        } catch (error) {
            alert('Lỗi', error.response?.data?.message || 'Lỗi server');
        }
        setLoading(false);
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Đăng Ký Bước 2</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Tên đăng nhập"
                    value={username}
                    onChangeText={setUsername}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Mật khẩu"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Họ và tên"
                    value={fullname}
                    onChangeText={setFullname}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Số điện thoại"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Ngày sinh (YYYY-MM-DD)"
                    value={birthday}
                    onChangeText={setBirthday}
                />
                <TouchableOpacity style={styles.imageButton} onPress={handleSelectImage}>
                    <Text style={styles.imageButtonText}>Chọn ảnh đại diện</Text>
                </TouchableOpacity>
                {image && (
                    <Image source={{ uri: image }} style={styles.avatar} />
                )}
                <TouchableOpacity style={styles.button} onPress={handleRegisterStep2} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Hoàn tất Đăng ký</Text>}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default RegisterStep2Screen;

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#f0f2f5',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    card: {
        width: '90%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 8,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    title: {
        fontSize: 22,
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        height: 45,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 10,
        marginBottom: 15,
    },
    imageButton: {
        backgroundColor: '#6c63ff',
        paddingVertical: 10,
        borderRadius: 4,
        alignItems: 'center',
        marginBottom: 15,
    },
    imageButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    avatar: {
        width: 150,
        height: 150,
        borderRadius: 75,
        alignSelf: 'center',
        marginBottom: 15,
    },
    button: {
        backgroundColor: '#1890ff',
        paddingVertical: 12,
        borderRadius: 4,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
});
