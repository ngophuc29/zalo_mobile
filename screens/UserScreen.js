import React, { useEffect, useState } from 'react';
import {
    View, Text, Image, StyleSheet, TouchableOpacity,
    Modal, TextInput, ScrollView, Alert, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_BASE = 'http://localhost:5000/api/accounts';

const UserScreen = ({ navigation, myname }) => {
    const [userInfo, setUserInfo] = useState({});
    const [isUpdateModalVisible, setUpdateModalVisible] = useState(false);
    const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
    const [updateData, setUpdateData] = useState({ fullname: '', birthday: '', image: '' });
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const userStr = await AsyncStorage.getItem('user');
                const stored = userStr ? JSON.parse(userStr) : {};
                const username = myname || stored.username;

                if (username) {
                    const res = await fetch(`${API_BASE}/username/${username}`);
                    const data = await res.json();
                    if (!data.message) {
                        setUserInfo(data);
                        await AsyncStorage.setItem('user', JSON.stringify(data));
                    }
                }
            } catch (err) {
                console.error('Lỗi tải thông tin:', err);
            }
        };
        fetchUser();
    }, [myname]);

    useEffect(() => {
        setUpdateData({
            fullname: userInfo.fullname || '',
            birthday: userInfo.birthday?.split('T')[0] || '',
            image: userInfo.image || '',
        });
    }, [userInfo]);

    const handleUpdateInfo = async () => {
        try {
            const res = await fetch(`${API_BASE}/${userInfo.username}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });
            const result = await res.json();

            if (result.message === 'Update successful') {
                alert('Cập nhật thành công!');
                setUpdateModalVisible(false);
                const updatedRes = await fetch(`${API_BASE}/username/${userInfo.username}`);
                const updatedData = await updatedRes.json();
                if (!updatedData.message) {
                    setUserInfo(updatedData);
                    await AsyncStorage.setItem('user', JSON.stringify(updatedData));
                }
            } else {
                alert('Không thể cập nhật thông tin.');
            }
        } catch (err) {
            alert('Lỗi khi cập nhật.');
        }
    };

    const handleChangePassword = async () => {
        const { oldPassword, newPassword, confirmPassword } = passwordData;

        if (!oldPassword || !newPassword || !confirmPassword) {
            return alert('Vui lòng điền đầy đủ các trường.');
        }
        if (newPassword !== confirmPassword) {
            return alert('Mật khẩu xác nhận không khớp.');
        }

        try {
            const res = await axios.put(`${API_BASE}/change-password/${userInfo.username}`, {
                oldPassword, newPassword,
            });

            if (res.status === 200 && res.data.message === 'Password updated') {
                alert('Đổi mật khẩu thành công!');
                setPasswordModalVisible(false);
                setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                alert(res.data.message || 'Thao tác thất bại.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Có lỗi xảy ra.');
        }
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const formatted = selectedDate.toISOString().split('T')[0];
            setUpdateData({ ...updateData, birthday: formatted });
        }
    };
    const handleLogout = async () => {
        await AsyncStorage.removeItem('user');
        navigation.reset({
            index: 0,
            routes: [{ name: 'Auth' }], // Điều hướng về Auth stack
        });
    };
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.infoContainer}>
                <Image
                    source={userInfo.image ? { uri: userInfo.image } : require('../assets/default-avatar.jpg')}
                    style={styles.avatar}
                />
                <Text style={styles.fullname}>{userInfo.fullname || 'Chưa cập nhật tên'}</Text>
                <Text style={styles.email}>{userInfo.email || 'Chưa có email'}</Text>
                {userInfo.phone && <Text style={styles.phone}>SĐT: {userInfo.phone}</Text>}
                {userInfo.birthday && (
                    <Text style={styles.birthday}>Ngày sinh: {new Date(userInfo.birthday).toLocaleDateString('vi-VN')}</Text>
                )}
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.updateButton} onPress={() => setUpdateModalVisible(true)}>
                    <Text style={styles.buttonText}>Cập nhật thông tin</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.updateButton} onPress={() => setPasswordModalVisible(true)}>
                    <Text style={styles.buttonText}>Đổi mật khẩu</Text>
                </TouchableOpacity>
            </View>
            <View>
                <TouchableOpacity style={[styles.updateButton, { backgroundColor: '#e74c3c' }]} onPress={handleLogout}>
                    <Text style={styles.buttonText}>Đăng xuất</Text>
                </TouchableOpacity>
            </View>

            {/* Modal cập nhật thông tin */}
            <Modal visible={isUpdateModalVisible} animationType="fade" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalWrapper}>
                        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Cập nhật thông tin</Text>

                                <Text style={styles.label}>Họ tên:</Text>
                                <TextInput
                                    style={styles.input}
                                    value={updateData.fullname}
                                    onChangeText={(text) => setUpdateData({ ...updateData, fullname: text })}
                                />

                                <Text style={styles.label}>Ngày sinh:</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                    <TextInput
                                        style={styles.input}
                                        value={updateData.birthday}
                                        editable={false}
                                        pointerEvents="none"
                                    />
                                </TouchableOpacity>

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={new Date(updateData.birthday || Date.now())}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onDateChange}
                                    />
                                )}

                                <Text style={styles.label}>Avatar (URL):</Text>
                                <TextInput
                                    style={styles.input}
                                    value={updateData.image}
                                    onChangeText={(text) => setUpdateData({ ...updateData, image: text })}
                                    placeholder="https://..."
                                />

                                {updateData.image ? (
                                    <Image source={{ uri: updateData.image }} style={styles.modalAvatar} />
                                ) : null}

                                <View style={styles.modalButtonGroup}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, { backgroundColor: '#888' }]}
                                        onPress={() => setUpdateModalVisible(false)}
                                    >
                                        <Text style={styles.buttonText}>Hủy</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.modalButton} onPress={handleUpdateInfo}>
                                        <Text style={styles.buttonText}>Lưu</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal đổi mật khẩu */}
            <Modal visible={isPasswordModalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalWrapper}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Đổi mật khẩu</Text>

                            <Text style={styles.label}>Mật khẩu cũ:</Text>
                            <TextInput
                                style={styles.input}
                                secureTextEntry
                                value={passwordData.oldPassword}
                                onChangeText={(text) => setPasswordData({ ...passwordData, oldPassword: text })}
                            />

                            <Text style={styles.label}>Mật khẩu mới:</Text>
                            <TextInput
                                style={styles.input}
                                secureTextEntry
                                value={passwordData.newPassword}
                                onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                            />

                            <Text style={styles.label}>Nhập lại mật khẩu:</Text>
                            <TextInput
                                style={styles.input}
                                secureTextEntry
                                value={passwordData.confirmPassword}
                                onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
                            />

                            <View style={styles.modalButtonGroup}>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: '#888' }]}
                                    onPress={() => setPasswordModalVisible(false)}
                                >
                                    <Text style={styles.buttonText}>Hủy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalButton} onPress={handleChangePassword}>
                                    <Text style={styles.buttonText}>Xác nhận</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

export default UserScreen;

const styles = StyleSheet.create({
    container: { padding: 20 },
    infoContainer: { alignItems: 'center', marginVertical: 20 },
    avatar: { width: 120, height: 120, borderRadius: 60 },
    fullname: { fontSize: 20, fontWeight: 'bold', marginTop: 10 },
    email: { fontSize: 16, color: '#666' },
    phone: { fontSize: 16, color: '#444' },
    birthday: { fontSize: 16, color: '#444' },

    buttonContainer: { marginTop: 20 },
    updateButton: {
        backgroundColor: '#3498db',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10
    },
    buttonText: { color: '#fff', fontWeight: 'bold' },

    modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
    modalWrapper: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 10, padding: 20 },
    modalContent: {},
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    label: { marginTop: 10, fontWeight: 'bold' },
    input: {
        borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8,
        marginTop: 5
    },
    modalButtonGroup: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
    modalButton: {
        flex: 1,
        backgroundColor: '#27ae60',
        padding: 12,
        marginHorizontal: 5,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalAvatar: { width: 100, height: 100, borderRadius: 50, marginTop: 10, alignSelf: 'center' },
});
