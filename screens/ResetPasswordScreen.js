// ResetPasswordScreen.js
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
import { useNavigation, useRoute } from '@react-navigation/native';

const ResetPasswordScreen = () => {
    const route = useRoute();
    const { email } = route.params || {};
    const navigation = useNavigation();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            alert('Lỗi', 'Không tìm thấy email, vui lòng quay lại bước trước.');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('Lỗi', 'Mật khẩu và xác nhận mật khẩu không khớp');
            return;
        }
        if (newPassword.length < 6) {
            alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('http://192.168.2.72:5000/api/accounts/reset-password', {
                email,
                newPassword,
            });
            if (response.status === 200) {
                alert('Thành công', 'Mật khẩu đã được thay đổi thành công!');
                navigation.navigate('Login');
            }
        } catch (error) {
            alert(
                'Lỗi',
                'Lỗi khi đổi mật khẩu: ' + (error.response?.data?.message || 'Lỗi server')
            );
        }
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Đặt lại mật khẩu</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Nhập mật khẩu mới"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Xác nhận mật khẩu"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                />
                <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Xác nhận đổi mật khẩu</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ResetPasswordScreen;

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
