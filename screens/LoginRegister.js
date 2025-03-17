// LoginRegister.js
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Button,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
 
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginRegister = ({ navigation }) => {
    
    const [activeTab, setActiveTab] = useState('login');

    // State cho login
    const [loginData, setLoginData] = useState({ phone: '', password: '' });
    // State cho register
    const [registerData, setRegisterData] = useState({
        username: '',
        phone: '',
        password: '',
        confirmPassword: '',
        fullname: '',
    });
    // State hiển thị loading
    const [loading, setLoading] = useState(false);

    const handleLogin = () => {
        if (!loginData.phone.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
            return;
        }
        setLoading(true);
        const data = {
            phone: loginData.phone,
            password: loginData.password,
        };

        fetch('http://localhost:5000/api/accounts/login', { // Thay localhost:5000 bằng địa chỉ backend của bạn
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
            .then((res) => res.json())
            .then((result) => {
                // Giả lập delay 2 giây trước khi tắt loading
                setTimeout(() => {
                    setLoading(false);
                    if (result.statusCode) {
                        Alert.alert('Lỗi', result.message);
                    } else {
                        AsyncStorage.setItem('username', result.username)
                            .then(() => {
                                // navigation.navigate('Chat'); // Chuyển sang màn hình chat sau khi đăng nhập thành công
                                navigation.navigate("Main");

                            })
                            .catch((error) => {
                                Alert.alert('Lỗi', 'Không lưu được dữ liệu: ' + error.message);
                            });
                    }
                }, 1000);
            })
            .catch((error) => {
                setTimeout(() => {
                    setLoading(false);
                    Alert.alert('Lỗi', 'Có lỗi xảy ra: ' + error.message);
                }, 1000);
            });
    };

    const handleRegister = () => {
        if (registerData.password !== registerData.confirmPassword) {
            Alert.alert('Lỗi', 'Password không trùng nhau!');
            return;
        }
        setLoading(true);
        const data = {
            username: registerData.username,
            phone: registerData.phone,
            password: registerData.password,
            fullname: registerData.fullname,
        };

        fetch('http://localhost:5000/api/accounts/register', { // Thay localhost:5000 bằng địa chỉ backend của bạn
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
            .then((res) => res.json())
            .then((result) => {
                // Giả lập delay 2 giây trước khi tắt loading
                setTimeout(() => {
                    setLoading(false);
                    if (result.statusCode) {
                        Alert.alert('Lỗi', result.message);
                    } else {
                        Alert.alert('Thành công', 'Đăng ký thành công, hãy đăng nhập!');
                        setActiveTab('login'); // Sau khi đăng ký, chuyển về tab đăng nhập
                    }
                }, 1000);
            })
            .catch((error) => {
                setTimeout(() => {
                    setLoading(false);
                    Alert.alert('Lỗi', 'Có lỗi xảy ra: ' + error.message);
                }, 1000);
            });
    };

    return (
        <View style={styles.container}>
            {/* Hiển thị hiệu ứng loading */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#007bff" />
                </View>
            )}
            {/* Tabs Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'login' && styles.activeTab]}
                    onPress={() => setActiveTab('login')}
                >
                    <Text style={styles.tabText}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'register' && styles.activeTab]}
                    onPress={() => setActiveTab('register')}
                >
                    <Text style={styles.tabText}>Register</Text>
                </TouchableOpacity>
            </View>

            {/* Nội dung form theo tab */}
            {activeTab === 'login' ? (
                <View style={styles.formContainer}>
                    <Text style={styles.header}>Login</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Phone Number"
                        value={loginData.phone}
                        onChangeText={(text) => setLoginData({ ...loginData, phone: text })}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        secureTextEntry
                        value={loginData.password}
                        onChangeText={(text) => setLoginData({ ...loginData, password: text })}
                    />
                    <Button title="Đăng nhập" onPress={handleLogin} />
                </View>
            ) : (
                <View style={styles.formContainer}>
                    <Text style={styles.header}>Đăng ký</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Username"
                        value={registerData.username}
                        onChangeText={(text) => setRegisterData({ ...registerData, username: text })}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Phone Number"
                        value={registerData.phone}
                        onChangeText={(text) => setRegisterData({ ...registerData, phone: text })}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        secureTextEntry
                        value={registerData.password}
                        onChangeText={(text) => setRegisterData({ ...registerData, password: text })}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Nhập lại Password"
                        secureTextEntry
                        value={registerData.confirmPassword}
                        onChangeText={(text) =>
                            setRegisterData({ ...registerData, confirmPassword: text })
                        }
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Nhập họ và tên"
                        value={registerData.fullname}
                        onChangeText={(text) => setRegisterData({ ...registerData, fullname: text })}
                    />
                    <Button title="Đăng ký" onPress={handleRegister} />
                </View>
            )}
        </View>
    );
};

export default LoginRegister;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    tabButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#007bff',
    },
    tabText: {
        fontSize: 16,
        color: '#007bff',
    },
    formContainer: {
        flex: 1,
    },
    header: {
        fontSize: 24,
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 10,
        paddingHorizontal: 10,
    },
});
