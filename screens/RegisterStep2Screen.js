import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

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

    const apiUrl = 'http://localhost:5000/api'; // đổi khi test

    const isOldEnough = (birth) => {
        const age = dayjs().diff(dayjs(birth), 'year');
        return age >= 13;
    };

    const showToast = (type, text) => {
        Toast.show({
            type,
            text1: text,
            position: 'top',
        });
    };

    const handleSelectImage = async () => {
        launchImageLibrary(
            {
                mediaType: 'photo',
                includeBase64: true,
                quality: 0.5,
            },
            (response) => {
                if (response.didCancel) return;

                if (response.errorCode) {
                    showToast('error', 'Lỗi chọn ảnh');
                    return;
                }

                const asset = response.assets?.[0];
                if (asset?.base64) {
                    const base64Image = `data:${asset.type};base64,${asset.base64}`;
                    setImage(base64Image);
                }
            }
        );
    };

    const handleRegisterStep2 = async () => {
        if (!username || !password || !fullname || !phone || !birthday) {
            showToast('error', 'Vui lòng nhập đầy đủ thông tin');
            return;
        }

        if (!isOldEnough(birthday)) {
            showToast('error', 'Bạn phải từ 13 tuổi trở lên');
            return;
        }

        setLoading(true);
        try {
            const usernameRes = await axios.get(`${apiUrl}/accounts/check-username`, {
                params: { username },
            });
            if (usernameRes.data.exists) {
                showToast('error', 'Tên đăng nhập đã tồn tại');
                setLoading(false);
                return;
            }

            const phoneRes = await axios.get(`${apiUrl}/accounts/check-phone`, {
                params: { phone },
            });
            if (phoneRes.data.exists) {
                showToast('error', 'Số điện thoại đã được sử dụng');
                setLoading(false);
                return;
            }

            const response = await axios.post(`${apiUrl}/accounts/register-step2`, {
                username,
                password,
                phone,
                email,
                birthday,
                fullname,
                image: image || undefined,
            });

            if (response.status === 201) {
                showToast('success', 'Đăng ký thành công!');
                setTimeout(() => {
                    navigation.navigate('Login');
                }, 1000);
            }
        } catch (error) {
            showToast('error', error.response?.data?.message || 'Đã xảy ra lỗi.');
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
            <Toast />
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
