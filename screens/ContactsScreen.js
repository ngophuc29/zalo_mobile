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

// Khởi tạo socket (đảm bảo dùng instance chung)
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

    // Lấy thông tin username từ AsyncStorage
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

    // Đăng ký các sự kiện socket giống web
    useEffect(() => {
        if (!socket || !myUsername) return;

        // Xử lý danh sách bạn bè
        const onFriendsList = (data) => {
            setFriends(data);
            groupFriendsByLetter(data);
        };

        // Xử lý danh sách lời mời kết bạn
        const onFriendRequests = (data) => {
            setFriendRequests(data);
        };

        // Thông báo khi có lời mời mới
        const onNewFriendRequest = (data) => {
            Toast.show({
                type: "info",
                text1: `Bạn có lời mời kết bạn từ ${data.from}`,
            });
            // Cập nhật state danh sách lời mời nếu có dữ liệu mảng mới
            setFriendRequests(data.requests || []);
        };

        // Khi lời mời được cập nhật (nếu người nhận là mình)
        const onFriendRequestUpdated = (data) => {
            if (data.to === myUsername) {
                socket.emit("getFriendRequests", myUsername);
            }
        };

        // Khi kết bạn thành công
        const onFriendAccepted = ({ friend, updatedFriends }) => {
            Toast.show({
                type: "success",
                text1: `Bạn đã kết bạn với ${friend}`,
            });
            if (updatedFriends) {
                setFriends(updatedFriends);
                groupFriendsByLetter(updatedFriends);
            } else {
                socket.emit("getFriends", myUsername);
            }
            socket.emit("getFriendRequests", myUsername);
        };

        // Các xử lý phản hồi lời mời, xóa bạn, thu hồi lời mời
        const onRespondFriendRequestResult = (data) => {
            Toast.show({ type: "info", text1: data.message });
            socket.emit("getFriendRequests", myUsername);
            socket.emit("getFriends", myUsername);
        };

        const onCancelFriendResult = (data) => {
            Toast.show({ type: "info", text1: data.message });
            socket.emit("getFriends", myUsername);
        };

        const onFriendRequestWithdrawn = (data) => {
            Toast.show({
                type: "info",
                text1: `${data.from} đã thu hồi lời mời kết bạn.`,
            });
            socket.emit("getFriendRequests", myUsername);
        };

        // Đăng ký sự kiện
        socket.on("friendsList", onFriendsList);
        socket.on("friendRequests", onFriendRequests);
        socket.on("newFriendRequest", onNewFriendRequest);
        socket.on("friendRequestUpdated", onFriendRequestUpdated);
        socket.on("friendAccepted", onFriendAccepted);
        socket.on("respondFriendRequestResult", onRespondFriendRequestResult);
        socket.on("cancelFriendResult", onCancelFriendResult);
        socket.on("friendRequestWithdrawn", onFriendRequestWithdrawn);

        // Emit dữ liệu ban đầu từ server
        socket.emit("getFriendRequests", myUsername);
        socket.emit("getFriends", myUsername);

        return () => {
            socket.off("friendsList", onFriendsList);
            socket.off("friendRequests", onFriendRequests);
            socket.off("newFriendRequest", onNewFriendRequest);
            socket.off("friendRequestUpdated", onFriendRequestUpdated);
            socket.off("friendAccepted", onFriendAccepted);
            socket.off("respondFriendRequestResult", onRespondFriendRequestResult);
            socket.off("cancelFriendResult", onCancelFriendResult);
            socket.off("friendRequestWithdrawn", onFriendRequestWithdrawn);
        };
    }, [myUsername]);

    // Khi màn hình được focus, đảm bảo emit lấy dữ liệu mới nhất
    useFocusEffect(
        React.useCallback(() => {
            if (socket && myUsername) {
                socket.emit("getFriendRequests", myUsername);
                socket.emit("getFriends", myUsername);
            }
            return () => { };
        }, [myUsername])
    );

    // Hàm nhóm bạn bè theo chữ cái đầu tiên (bao gồm search)
    const groupFriendsByLetter = (friendsList) => {
        const filtered = friendsList.filter((friend) =>
            friend.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const grouped = filtered.reduce((acc, friend) => {
            const firstLetter = friend.charAt(0).toUpperCase();
            if (!acc[firstLetter]) acc[firstLetter] = [];
            acc[firstLetter].push(friend);
            return acc;
        }, {});
        setGroupedFriends(grouped);
        setSortedLetters(Object.keys(grouped).sort());
    };

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

    const renderFriendGroup = ({ item: letter }) => (
        <View key={letter} style={styles.friendGroup}>
            <Text style={styles.groupTitle}>{letter}</Text>
            {groupedFriends[letter].map((friend, index) => (
                <View key={index} style={styles.friendItem}>
                    <Text style={styles.friendText}>{friend}</Text>
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveFriend(friend)}
                    >
                        <MaterialIcons name="delete" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header với search */}
            <View style={styles.header}>
                <View style={styles.searchContainer}>
                    <FontAwesome name="search" size={16} color="#888" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm"
                        value={searchTerm}
                        onChangeText={(text) => {
                            setSearchTerm(text);
                            groupFriendsByLetter(friends);
                        }}
                    />
                </View>
            </View>

            {/* Menu tabs */}
            <View style={styles.menuContainer}>
                {menuItems.map((item) => (
                    <TouchableOpacity
                        key={item.label}
                        style={[styles.menuButton, activeMenu === item.label && styles.activeMenuButton]}
                        onPress={() => {
                            setActiveMenu(item.label);
                            // Khi chuyển tab, gọi lại dữ liệu tương ứng
                            if (item.label === "Danh sách bạn bè") {
                                socket.emit("getFriends", myUsername);
                            } else if (item.label === "Lời mời kết bạn") {
                                socket.emit("getFriendRequests", myUsername);
                            }
                        }}
                    >
                        <FontAwesome
                            name={item.icon}
                            size={18}
                            color={activeMenu === item.label ? "#007AFF" : "#555"}
                        />
                        <Text style={[styles.menuText, activeMenu === item.label && styles.activeMenuText]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Nội dung chính */}
            <ScrollView style={styles.content}>
                {activeMenu === "Danh sách bạn bè" ? (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Danh sách bạn bè</Text>
                            <Text style={styles.countText}>{friends.length} bạn bè</Text>
                        </View>
                        {sortedLetters.length > 0 ? (
                            <FlatList
                                data={sortedLetters}
                                renderItem={renderFriendGroup}
                                keyExtractor={(item) => item}
                                scrollEnabled={false}
                            />
                        ) : (
                            <Text style={styles.emptyText}>Chưa có bạn bè.</Text>
                        )}
                    </>
                ) : (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Lời mời kết bạn</Text>
                            <Text style={styles.countText}>{friendRequests.length} lời mời</Text>
                        </View>
                        {friendRequests.length > 0 ? (
                            <FlatList
                                data={friendRequests}
                                renderItem={renderFriendRequest}
                                keyExtractor={(item) => item._id || item.id}
                                scrollEnabled={false}
                            />
                        ) : (
                            <Text style={styles.emptyText}>Không có lời mời kết bạn.</Text>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Modal xác nhận xóa bạn */}
            <Modal
                visible={confirmVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setConfirmVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Xác nhận</Text>
                        <Text style={styles.modalText}>
                            Bạn có chắc muốn xóa {friendToRemove} khỏi danh sách bạn bè?
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setConfirmVisible(false)}
                            >
                                <Text style={styles.modalButtonText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={confirmRemoveFriend}
                            >
                                <Text style={styles.modalButtonText}>Xóa</Text>
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
