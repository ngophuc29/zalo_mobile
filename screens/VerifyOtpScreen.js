// VerifyOtpScreen.js
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

const VerifyOtpScreen = () => {
    const route = useRoute();
    const { email, type } = route.params || {};
    const navigation = useNavigation();

    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerifyOtp = async () => {
        if (!otp.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập OTP!');
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post('https://sockettubuild.onrender.com/api/accounts/verify-otp', {
                email,
                otp,
            });
            if (response.status === 200) {
                Alert.alert('Thành công', 'Xác thực OTP thành công!');
                if (type === 'new') {
                    navigation.navigate('RegisterStep2', { email });
                } else {
                    navigation.navigate('ResetPassword', { email });
                }
            }
        } catch (error) {
            Alert.alert(
                'Lỗi',
                'OTP không hợp lệ: ' + (error.response?.data?.message || 'Lỗi server')
            );
        }
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Xác Thực OTP</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Nhập mã OTP"
                    value={otp}
                    onChangeText={setOtp}
                />
                <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Xác Thực OTP</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default VerifyOtpScreen;

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
