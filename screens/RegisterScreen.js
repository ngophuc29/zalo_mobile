// RegisterScreen.js
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

const RegisterScreen = () => {
    const [email, setEmail] = useState('');
    const [emailRegistered, setEmailRegistered] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    // Kiểm tra định dạng email
    const isValidEmailFormat = (email) => {
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        return emailRegex.test(email);
    };

    // Hàm gọi API kiểm tra email khi mất focus
    const handleEmailBlur = async () => {
        if (!email || !isValidEmailFormat(email)) return;
        try {
            const response = await axios.get('http://localhost:5000/api/accounts/check-email', {
                params: { email },
            });
            if (response.data.exists) {
                setEmailRegistered(true);
                alert('Lỗi', 'Email đã tồn tại trên hệ thống');
            } else {
                setEmailRegistered(false);
            }
        } catch (error) {
            alert('Lỗi', 'Lỗi kiểm tra email');
        }
    };

    const handleSendOtp = async () => {
        if (emailRegistered) {
            alert('Lỗi', 'Email đã được đăng ký. Vui lòng nhập email khác.');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('http://localhost:5000/api/accounts/register-step1', { email });
            if (response.status === 200) {
                alert('Thành công', 'OTP đã được gửi tới email của bạn. Vui lòng kiểm tra.');
                navigation.navigate('VerifyOtp', { email, type: 'new' });
            }
        } catch (error) {
            alert('Lỗi', error.response?.data?.message || 'Lỗi server');
        }
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Đăng Ký</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Nhập email"
                    value={email}
                    onChangeText={setEmail}
                    onBlur={handleEmailBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <TouchableOpacity
                    style={[styles.button, emailRegistered && { backgroundColor: '#ccc' }]}
                    onPress={handleSendOtp}
                    disabled={loading || emailRegistered}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Gửi OTP</Text>}
                </TouchableOpacity>
                <View style={styles.linkContainer}>
                    <Text>
                        Đã có tài khoản?{' '}
                        <Text style={styles.linkText} onPress={() => navigation.navigate('Login')}>
                            Đăng nhập ngay
                        </Text>
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default RegisterScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: '85%',
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
    button: {
        backgroundColor: '#1890ff',
        paddingVertical: 12,
        borderRadius: 4,
        alignItems: 'center',
        marginBottom: 15,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    linkContainer: {
        alignItems: 'center',
    },
    linkText: {
        color: '#1890ff',
        marginTop: 8,
    },
});
