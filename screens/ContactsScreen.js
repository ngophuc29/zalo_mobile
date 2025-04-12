// ContactsScreen.js
import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
 
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import Toast from 'react-native-toast-message';
import ConfirmModal from "./ConfirmModal"; // Giả sử ConfirmModal đã được xây dựng
import { io } from "socket.io-client";
const socket = io("http://localhost:5000");
const ContactsScreen = () => {
    const [friendRequests, setFriendRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [myUsername, setMyUsername] = useState("Guest");
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [friendToRemove, setFriendToRemove] = useState(null);

    // Lấy username từ AsyncStorage khi component mount
    useEffect(() => {
        const fetchUsername = async () => {
            try {
                const userStr = await AsyncStorage.getItem("user");
                const user = userStr ? JSON.parse(userStr) : {};
                if (user.username) {
                    setMyUsername(user.username);
                }
            } catch (error) {
                console.error("Lỗi khi lấy username:", error);
            }
        };
        fetchUsername();
    }, []);

    // Đăng ký các sự kiện socket khi component mount
    useEffect(() => {
        if (!socket || !myUsername) return;

        const onFriendRequests = (data) => setFriendRequests(data);
        const onFriendsList = (data) => setFriends(data);
        const onRespondFriendRequestResult = (data) => {
            Toast.show({ type: "info", text1: data.message });
            socket.emit("getFriendRequests", myUsername);
            socket.emit("getFriends", myUsername);
        };
        const onCancelFriendResult = (data) => {
            Toast.show({ type: "info", text1: data.message });
            socket.emit("getFriends", myUsername);
        };

        socket.on("friendRequests", onFriendRequests);
        socket.on("friendsList", onFriendsList);
        socket.on("respondFriendRequestResult", onRespondFriendRequestResult);
        socket.on("cancelFriendResult", onCancelFriendResult);

        return () => {
            socket.off("friendRequests", onFriendRequests);
            socket.off("friendsList", onFriendsList);
            socket.off("respondFriendRequestResult", onRespondFriendRequestResult);
            socket.off("cancelFriendResult", onCancelFriendResult);
        };
    }, [myUsername]);

    // useFocusEffect: refresh dữ liệu mỗi khi màn hình Contacts được hiển thị
    useFocusEffect(
        React.useCallback(() => {
            if (socket && myUsername) {
                socket.emit("getFriendRequests", myUsername);
                socket.emit("getFriends", myUsername);
            }
            // Bạn có thể trả về một hàm cleanup nếu cần
            return () => { };
        }, [myUsername])
    );

    const handleRespond = (requestId, action) => {
        socket.emit("respondFriendRequest", { requestId, action });
    };

    const handleRemoveFriend = (friendUsername) => {
        setFriendToRemove(friendUsername);
        setConfirmVisible(true);
    };

    const confirmRemoveFriend = () => {
        if (friendToRemove) {
            socket.emit("cancelFriend", { myUsername, friendUsername: friendToRemove });
        }
        setConfirmVisible(false);
        setFriendToRemove(null);
    };

    const cancelRemoveFriend = () => {
        setConfirmVisible(false);
        setFriendToRemove(null);
    };

    const renderFriendRequest = ({ item }) => (
        <View style={styles.requestItem}>
            <Text style={styles.requestText}>Từ: {item.from}</Text>
            <View style={styles.requestButtons}>
                <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleRespond(item._id || item.id, "accepted")}
                >
                    <Text style={styles.buttonText}>Chấp nhận</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleRespond(item._id || item.id, "rejected")}
                >
                    <Text style={styles.buttonText}>Từ chối</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderFriend = ({ item }) => (
        <View style={styles.friendItem}>
            <Text style={styles.friendText}>{item}</Text>
            <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveFriend(item)}
            >
                <Text style={styles.buttonText}>Xóa bạn</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Danh Bạ</Text>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Lời mời kết bạn</Text>
                {friendRequests.length === 0 ? (
                    <Text style={styles.emptyText}>Không có lời mời kết bạn.</Text>
                ) : (
                    <FlatList
                        data={friendRequests}
                        keyExtractor={(item) => item._id || item.id}
                        renderItem={renderFriendRequest}
                    />
                )}
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Danh sách bạn bè</Text>
                {friends.length === 0 ? (
                    <Text style={styles.emptyText}>Chưa có bạn bè.</Text>
                ) : (
                    <FlatList
                        data={friends}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={renderFriend}
                    />
                )}
            </View>
            <ConfirmModal
                visible={confirmVisible}
                message={`Bạn có chắc muốn xóa ${friendToRemove} khỏi danh sách bạn bè không?`}
                onConfirm={confirmRemoveFriend}
                onCancel={cancelRemoveFriend}
            />
        </View>
    );
};

export default ContactsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#fff",
    },
    title: {
        textAlign: "center",
        fontSize: 24,
        color: "#333",
        marginBottom: 20,
        fontFamily: "Arial",
    },
    section: {
        marginBottom: 30,
        padding: 15,
        borderRadius: 8,
        backgroundColor: "#f9f9f9",
    },
    sectionTitle: {
        marginBottom: 10,
        color: "#555",
        fontSize: 18,
    },
    emptyText: {
        fontStyle: "italic",
        color: "#888",
    },
    requestItem: {
        padding: 10,
        marginBottom: 10,
        borderRadius: 6,
        backgroundColor: "#fff",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    requestText: {
        color: "#444",
        fontWeight: "bold",
    },
    requestButtons: {
        flexDirection: "row",
        marginTop: 10,
        justifyContent: "space-between",
    },
    acceptButton: {
        flex: 1,
        backgroundColor: "#28a745",
        padding: 8,
        borderRadius: 4,
        alignItems: "center",
        marginRight: 5,
    },
    rejectButton: {
        flex: 1,
        backgroundColor: "#dc3545",
        padding: 8,
        borderRadius: 4,
        alignItems: "center",
        marginLeft: 5,
    },
    friendItem: {
        padding: 10,
        marginBottom: 10,
        borderRadius: 6,
        backgroundColor: "#fff",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    friendText: {
        fontWeight: "bold",
        color: "#333",
    },
    removeButton: {
        backgroundColor: "#ff6b6b",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4,
    },
    buttonText: {
        color: "#fff",
    },
});
