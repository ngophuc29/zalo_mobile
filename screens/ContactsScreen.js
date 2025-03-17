// Contacts.js
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert
} from "react-native";
import io from "socket.io-client";
import AsyncStorage from '@react-native-async-storage/async-storage';

const socket = io("http://localhost:5000"); // Thay đổi URL nếu cần

const Contacts = () => {
    const [friendRequests, setFriendRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [myUsername, setMyUsername] = useState("Guest");

    // Lấy username từ AsyncStorage thay cho localStorage
    useEffect(() => {
        AsyncStorage.getItem("username").then((username) => {
            if (username) setMyUsername(username);
        });
    }, []);

    useEffect(() => {
        if (!myUsername) return;
        socket.emit("getFriendRequests", myUsername);
        socket.emit("getFriends", myUsername);

        socket.on("friendRequests", (data) => setFriendRequests(data));
        socket.on("friendsList", (data) => setFriends(data));

        socket.on("respondFriendRequestResult", (data) => {
            Alert.alert("Thông báo", data.message);
            socket.emit("getFriendRequests", myUsername);
            socket.emit("getFriends", myUsername);
        });

        socket.on("cancelFriendResult", (data) => {
            Alert.alert("Thông báo", data.message);
            socket.emit("getFriends", myUsername);
        });

        return () => {
            socket.off("friendRequests");
            socket.off("friendsList");
            socket.off("respondFriendRequestResult");
            socket.off("cancelFriendResult");
        };
    }, [myUsername]);

    const handleRespond = (requestId, action) => {
        socket.emit("respondFriendRequest", { requestId, action });
    };

    const handleRemoveFriend = (friendUsername) => {
        Alert.alert(
            "Xác nhận",
            `Bạn có chắc muốn xóa ${friendUsername} khỏi danh sách bạn bè không?`,
            [
                { text: "Hủy", style: "cancel" },
                { text: "Đồng ý", onPress: () => socket.emit("cancelFriend", { myUsername, friendUsername }) }
            ]
        );
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

            {/* Lời mời kết bạn */}
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

            {/* Danh sách bạn bè */}
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
        </View>
    );
};

export default Contacts;

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
