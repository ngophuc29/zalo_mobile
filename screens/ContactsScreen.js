import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ScrollView,
    Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { io } from "socket.io-client";

// Khởi tạo socket (đảm bảo dùng 1 instance chung)
// const socket = io("http://192.168.2.72:5000");
const socket = io("http://localhost:5000");


const menuItems = [
    { icon: "users", label: "Danh sách bạn bè" },
    { icon: "user-plus", label: "Lời mời kết bạn" },
];

const ContactsScreen = () => {
    const [friendRequests, setFriendRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [myUsername, setMyUsername] = useState("Guest");
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [friendToRemove, setFriendToRemove] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeMenu, setActiveMenu] = useState("Danh sách bạn bè");
    const [groupedFriends, setGroupedFriends] = useState({});
    const [sortedLetters, setSortedLetters] = useState([]);

    // Lấy username từ AsyncStorage
    useEffect(() => {
        (async () => {
            try {
                const userStr = await AsyncStorage.getItem("user");
                const user = userStr ? JSON.parse(userStr) : {};
                if (user.username) setMyUsername(user.username);
            } catch (err) {
                console.error("Lỗi lấy username:", err);
            }
        })();
    }, []);

    // Hàm nhóm và filter lại bạn bè
    const groupFriendsByLetter = (list) => {
        const filtered = list.filter((f) =>
            f.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const grouped = filtered.reduce((acc, friend) => {
            const c = friend.charAt(0).toUpperCase();
            if (!acc[c]) acc[c] = [];
            acc[c].push(friend);
            return acc;
        }, {});
        setGroupedFriends(grouped);
        setSortedLetters(Object.keys(grouped).sort());
    };

    // Đăng ký socket events
    useEffect(() => {
        if (!socket || !myUsername) return;
        // 0) Đăng ký user với server để nhận các emit riêng
        socket.emit("registerUser", myUsername);
        // 1) Khi server gửi danh sách bạn mới hoặc lần đầu getFriends
        const onFriendsList = (data) => {
            setFriends(data);
            groupFriendsByLetter(data);
        };

        // 2) Khi server emit sau accept/cancel bạn
        const onFriendsListUpdated = (data) => {
            setFriends(data);
            groupFriendsByLetter(data);
        };

        // 3) Lời mời
        const onFriendRequests = (data) => {
            setFriendRequests(data);
        };

        // 4) Có lời mời mới
        const onNewFriendRequest = (data) => {
            Toast.show({ type: "info", text1: `Bạn có lời mời từ ${data.from}` });
            setFriendRequests(data.requests || []);
        };

        // 5) Khi lời mời liên quan đến mình thay đổi
        const onFriendRequestUpdated = (data) => {
            if (data.to === myUsername) {
                socket.emit("getFriendRequests", myUsername);
            }
        };

        // 6) Accept thành công (chỉ toast và reload requests)
        const onFriendAccepted = ({ friend }) => {
            Toast.show({ type: "success", text1: `Bạn đã kết bạn với ${friend}` });
            socket.emit("getFriendRequests", myUsername);
            // danh sách bạn sẽ được cập nhật qua friendsListUpdated
        };

        // 7) Phản hồi accept/reject
        const onRespondResult = (data) => {
            Toast.show({ type: "info", text1: data.message });
            socket.emit("getFriendRequests", myUsername);
        };

        // 8) Phản hồi hủy bạn
        const onCancelResult = (data) => {
            Toast.show({ type: "info", text1: data.message });
            // danh sách bạn sẽ được cập nhật qua friendsListUpdated
        };

        // 9) Phản hồi thu hồi lời mời
        const onWithdrawn = (data) => {
            Toast.show({ type: "info", text1: `${data.from} đã thu hồi lời mời.` });
            socket.emit("getFriendRequests", myUsername);
        };

        // Đăng ký tất cả
        socket.on("friendsList", onFriendsList);
        socket.on("friendsListUpdated", onFriendsListUpdated);
        socket.on("friendRequests", onFriendRequests);
        socket.on("newFriendRequest", onNewFriendRequest);
        socket.on("friendRequestUpdated", onFriendRequestUpdated);
        socket.on("friendAccepted", onFriendAccepted);
        socket.on("respondFriendRequestResult", onRespondResult);
        socket.on("cancelFriendResult", onCancelResult);
        socket.on("friendRequestWithdrawn", onWithdrawn);

        // Emit lấy ban đầu
        socket.emit("getFriends", myUsername);
        socket.emit("getFriendRequests", myUsername);

        // Cleanup
        return () => {
            socket.off("friendsList", onFriendsList);
            socket.off("friendsListUpdated", onFriendsListUpdated);
            socket.off("friendRequests", onFriendRequests);
            socket.off("newFriendRequest", onNewFriendRequest);
            socket.off("friendRequestUpdated", onFriendRequestUpdated);
            socket.off("friendAccepted", onFriendAccepted);
            socket.off("respondFriendRequestResult", onRespondResult);
            socket.off("cancelFriendResult", onCancelResult);
            socket.off("friendRequestWithdrawn", onWithdrawn);
        };
    }, [myUsername, searchTerm]);

    // Khi focus lại screen
    useFocusEffect(
        React.useCallback(() => {
            if (socket && myUsername) {
                socket.emit("getFriends", myUsername);
                socket.emit("getFriendRequests", myUsername);
            }
        }, [myUsername])
    );

    // Xử lý accept/reject
    const handleRespond = (id, action) =>
        socket.emit("respondFriendRequest", { requestId: id, action });

    // Xử lý xóa bạn
    const handleRemoveFriend = (f) => {
        setFriendToRemove(f);
        setConfirmVisible(true);
    };
    const confirmRemoveFriend = () => {
        if (friendToRemove) {
            socket.emit("cancelFriend", { myUsername, friendUsername: friendToRemove });
        }
        setConfirmVisible(false);
        setFriendToRemove(null);
    };

    // Render từng nhóm bạn theo chữ cái
    const renderFriendGroup = ({ item: letter }) => (
        <View key={letter}>
            <Text style={styles.groupTitle}>{letter}</Text>
            {groupedFriends[letter].map((f, i) => (
                <View key={i} style={styles.friendItem}>
                    <Text style={styles.friendText}>{f}</Text>
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveFriend(f)}
                    >
                        <MaterialIcons name="delete" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    );

    // Render lời mời
    const renderFriendRequest = ({ item }) => (
        <View style={styles.requestItem}>
            <Text style={styles.requestText}>Từ: {item.from}</Text>
            <View style={styles.requestButtons}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleRespond(item._id || item.id, "accepted")}
                >
                    <Text style={styles.buttonText}>Chấp nhận</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleRespond(item._id || item.id, "rejected")}
                >
                    <Text style={styles.buttonText}>Từ chối</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header + Search */}
            <View style={styles.header}>
                <View style={styles.searchContainer}>
                    <FontAwesome name="search" size={16} color="#888" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm"
                        value={searchTerm}
                        onChangeText={(t) => {
                            setSearchTerm(t);
                            groupFriendsByLetter(friends);
                        }}
                    />
                </View>
            </View>

            {/* Menu tab */}
            <View style={styles.menuContainer}>
                {menuItems.map((m) => (
                    <TouchableOpacity
                        key={m.label}
                        style={[
                            styles.menuButton,
                            activeMenu === m.label && styles.activeMenuButton,
                        ]}
                        onPress={() => {
                            setActiveMenu(m.label);
                            if (m.label === "Danh sách bạn bè") {
                                socket.emit("getFriends", myUsername);
                            } else {
                                socket.emit("getFriendRequests", myUsername);
                            }
                        }}
                    >
                        <FontAwesome
                            name={m.icon}
                            size={18}
                            color={activeMenu === m.label ? "#007AFF" : "#555"}
                        />
                        <Text
                            style={[
                                styles.menuText,
                                activeMenu === m.label && styles.activeMenuText,
                            ]}
                        >
                            {m.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            <View style={styles.content}>
                {activeMenu === "Danh sách bạn bè" ? (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Bạn bè</Text>
                            <Text style={styles.countText}>{friends.length}</Text>
                        </View>
                        {sortedLetters.length ? (
                            <FlatList
                                data={sortedLetters}
                                renderItem={renderFriendGroup}
                                keyExtractor={(item) => item}
                                ListEmptyComponent={<Text style={styles.emptyText}>Chưa có bạn bè.</Text>}
                            />
                        ) : (
                            <Text style={styles.emptyText}>Chưa có bạn bè.</Text>
                        )}
                    </>
                ) : (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Lời mời</Text>
                            <Text style={styles.countText}>{friendRequests.length}</Text>
                        </View>
                        <FlatList
                            data={friendRequests}
                            renderItem={renderFriendRequest}
                            keyExtractor={(item) => item._id || item.id}
                            ListEmptyComponent={<Text style={styles.emptyText}>Không có lời mời.</Text>}
                        />
                    </>
                )}
            </View>

            {/* Modal confirm xóa bạn */}
            <Modal visible={confirmVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Xác nhận</Text>
                        <Text style={styles.modalText}>
                            Xóa {friendToRemove} khỏi bạn bè?
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setConfirmVisible(false)}
                            >
                                <Text>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={confirmRemoveFriend}
                            >
                                <Text style={{ color: "#fff" }}>Xóa</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Toast />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    header: {
        padding: 15,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f1f1f1",
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 8,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    menuContainer: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    menuButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 15,
        borderBottomWidth: 3,
        borderBottomColor: "transparent",
    },
    activeMenuButton: {
        borderBottomColor: "#007AFF",
    },
    menuText: {
        marginLeft: 8,
        fontSize: 14,
        color: "#555",
    },
    activeMenuText: {
        color: "#007AFF",
        fontWeight: "bold",
    },
    content: {
        flex: 1,
        padding: 15,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    countText: {
        fontSize: 14,
        color: "#888",
    },
    emptyText: {
        textAlign: "center",
        marginTop: 20,
        color: "#888",
        fontStyle: "italic",
    },
    requestItem: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    requestText: {
        fontSize: 16,
        color: "#333",
        marginBottom: 10,
    },
    requestButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    actionButton: {
        flex: 1,
        borderRadius: 5,
        padding: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    acceptButton: {
        backgroundColor: "#28a745",
        marginRight: 5,
    },
    rejectButton: {
        backgroundColor: "#dc3545",
        marginLeft: 5,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    friendGroup: {
        marginBottom: 20,
    },
    groupTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#555",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        marginBottom: 10,
    },
    friendItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    friendText: {
        fontSize: 16,
        color: "#333",
    },
    removeButton: {
        backgroundColor: "#ff6b6b",
        borderRadius: 5,
        padding: 6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "80%",
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#333",
    },
    modalText: {
        fontSize: 16,
        marginBottom: 20,
        color: "#555",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    modalButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 5,
        marginLeft: 10,
    },
    cancelButton: {
        backgroundColor: "#e0e0e0",
    },
    confirmButton: {
        backgroundColor: "#ff6b6b",
    },
    modalButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
});

export default ContactsScreen;
