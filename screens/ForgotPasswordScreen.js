import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

const ForgotPasswordScreen = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    const handleSubmit = async () => {
        if (!email) {
            alert('Lỗi', 'Vui lòng nhập email của bạn!');
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post('https://sockettubuild.onrender.com/api/accounts/forgot-password', { email });
            if (response.status === 200) {
                alert('Thành công', 'Đã gửi email đặt lại mật khẩu! Kiểm tra hộp thư của bạn.');
                navigation.navigate('VerifyOtp', { email });
            }
        } catch (error) {
            alert('Lỗi', error.response?.data?.message || 'Lỗi server');
        }
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Quên Mật Khẩu</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Nhập email của bạn"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Gửi Email</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ForgotPasswordScreen;

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
        fontSize: 20,
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
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
});
