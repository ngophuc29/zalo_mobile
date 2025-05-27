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

    const [usernameError, setUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [fullnameError, setFullnameError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [birthdayError, setBirthdayError] = useState('');

    const apiUrl = 'https://sockettubuild.onrender.com/api'; // đổi khi test

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

    const validateUsername = async (value) => {
        if (!value) {
            setUsernameError('Tên đăng nhập không được để trống');
            return false;
        }
        if (value.length < 4) {
            setUsernameError('Tên đăng nhập phải từ 4 ký tự trở lên');
            return false;
        }
        try {
            const res = await axios.get(`${apiUrl}/accounts/check-username`, { params: { username: value } });
            if (res.data.exists) {
                setUsernameError('Tên đăng nhập đã tồn tại');
                return false;
            }
        } catch (e) {}
        setUsernameError('');
        return true;
    };

    const validatePassword = (value) => {
        if (!value) {
            setPasswordError('Mật khẩu không được để trống');
            return false;
        }
        if (value.length < 6) {
            setPasswordError('Mật khẩu phải từ 6 ký tự trở lên');
            return false;
        }
        setPasswordError('');
        return true;
    };

    const validateFullname = (value) => {
        if (!value) {
            setFullnameError('Họ và tên không được để trống');
            return false;
        }
        setFullnameError('');
        return true;
    };

    const validatePhone = async (value) => {
        if (!value) {
            setPhoneError('Số điện thoại không được để trống');
            return false;
        }
        if (!/^\d{10,11}$/.test(value)) {
            setPhoneError('Số điện thoại không hợp lệ');
            return false;
        }
        try {
            const res = await axios.get(`${apiUrl}/accounts/check-phone`, { params: { phone: value } });
            if (res.data.exists) {
                setPhoneError('Số điện thoại đã được sử dụng');
                return false;
            }
        } catch (e) {}
        setPhoneError('');
        return true;
    };

    const validateBirthday = (value) => {
        if (!value) {
            setBirthdayError('Ngày sinh không được để trống');
            return false;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            setBirthdayError('Định dạng ngày sinh không hợp lệ (YYYY-MM-DD)');
            return false;
        }
        if (!isOldEnough(value)) {
            setBirthdayError('Bạn phải từ 13 tuổi trở lên');
            return false;
        }
        setBirthdayError('');
        return true;
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

                <Text style={styles.inputTitle}>Tên đăng nhập</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Tên đăng nhập"
                    value={username}
                    onChangeText={setUsername}
                    onBlur={() => validateUsername(username)}
                    autoCapitalize="none"
                />
                {!!usernameError && <Text style={styles.errorText}>{usernameError}</Text>}

                <Text style={styles.inputTitle}>Mật khẩu</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Mật khẩu"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    onBlur={() => validatePassword(password)}
                />
                {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

                <Text style={styles.inputTitle}>Họ và tên</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Họ và tên"
                    value={fullname}
                    onChangeText={setFullname}
                    onBlur={() => validateFullname(fullname)}
                />
                {!!fullnameError && <Text style={styles.errorText}>{fullnameError}</Text>}

                <Text style={styles.inputTitle}>Số điện thoại</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Số điện thoại"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    onBlur={() => validatePhone(phone)}
                />
                {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}

                <Text style={styles.inputTitle}>Ngày sinh (YYYY-MM-DD)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ngày sinh (YYYY-MM-DD)"
                    value={birthday}
                    onChangeText={setBirthday}
                    onBlur={() => validateBirthday(birthday)}
                />
                {!!birthdayError && <Text style={styles.errorText}>{birthdayError}</Text>}

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
    inputTitle: {
        fontWeight: 'bold',
        marginBottom: 4,
        marginTop: 8,
    },
    errorText: {
        color: 'red',
        marginBottom: 8,
        marginLeft: 2,
        fontSize: 13,
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
