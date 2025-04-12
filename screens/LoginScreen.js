// LoginScreen.js
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message'; 
const LoginScreen = ({ setIsLoggedIn }) => {
    const [account, setAccount] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    const handleLogin = async () => {
        if (!account || !password) {
            Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
            return;
        }

        setLoading(true);
        const apiUrl = 'http://localhost:5000/api';

        try {
            const response = await axios.post(`${apiUrl}/accounts/login`, {
                email: account,
                username: account,
                phone: account,
                password,
            });

            if (response.status === 200) {
                const { token } = response.data;

                await AsyncStorage.setItem('token', token);
                await AsyncStorage.setItem('user', JSON.stringify(response.data));

               

                Toast.show({
                    type: 'success', // 'success' | 'error' | 'info'
                    text1: 'Thành công',
                    text2: 'Đăng nhập thành công👋',
                });

                setIsLoggedIn(true); // ✅ Điều khiển App.js chuyển sang màn hình chính
            }
        } catch (error) {
            Toast.show({
                type: 'error', // 'success' | 'error' | 'info'
                text1: 'Thất bại',
                text2: 'Đăng nhập thất bại 👋',
            });
        }

        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Đăng Nhập</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Email / Username / Số điện thoại"
                    value={account}
                    onChangeText={setAccount}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Nhập mật khẩu"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />
                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Đăng nhập</Text>
                    )}
                </TouchableOpacity>
                <View style={styles.linkContainer}>
                    <Text>
                        Chưa có tài khoản?{' '}
                        <Text style={styles.linkText} onPress={() => navigation.navigate('Register')}>
                            Đăng ký ngay
                        </Text>
                    </Text>
                    <Text style={styles.linkText} onPress={() => navigation.navigate('ResetPassword')}>
                        Quên mật khẩu?
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default LoginScreen;


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
        elevation: 4, // for Android
        shadowColor: '#000', // iOS
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
