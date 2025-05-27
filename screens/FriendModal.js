import React, { useState, useEffect } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import Toast from "react-native-toast-message";
import { io } from "socket.io-client";

// const socket = io("https://sockettubuild.onrender.com");
const socket = io("https://sockettubuild.onrender.com");
const FriendModal = ({
    friendInput,
    setFriendInput,
    accounts,
    myname,
    friends,
    setFriendModalVisible,
    handleAddFriend,
    handleWithdrawFriendRequest,
    requestedFriends,
    setRequestedFriends,
    friendRequests,
    setFriendRequests,
    handleRespondToFriendRequest,
    socket
}) => {
    const [loadingFriend, setLoadingFriend] = useState(null);
    const [activeTab, setActiveTab] = useState("search");
    const [socketInitialized, setSocketInitialized] = useState(false);

    // Socket listeners cho realtime updates
    useEffect(() => {
        if (socketInitialized) return;

        // Khi có lời mời mới được gửi đến user hiện tại
        const onNewFriendRequest = (data) => {
            if (data.to === myname) {
                setFriendRequests(prev =>
                    prev.includes(data.from) ? prev : [...prev, data.from]
                );
            }
        };

        // Khi lời mời bị thu hồi
        const onFriendRequestWithdrawn = ({ from, to }) => {
            if (from === myname) {
                setRequestedFriends(prev => prev.filter(u => u !== to));
            } else if (to === myname) {
                setFriendRequests(prev => prev.filter(u => u !== from));
            }
        };

        // Khi lời mời được chấp nhận
        const onFriendAccepted = ({ friend, roomId }) => {
            setRequestedFriends(prev => prev.filter(u => u !== friend));
            setFriendRequests(prev => prev.filter(u => u !== friend));
        };

        socket.on("newFriendRequest", onNewFriendRequest);
        socket.on("friendRequestWithdrawn", onFriendRequestWithdrawn);
        socket.on("friendAccepted", onFriendAccepted);

        setSocketInitialized(true);

        return () => {
            socket.off("newFriendRequest", onNewFriendRequest);
            socket.off("friendRequestWithdrawn", onFriendRequestWithdrawn);
            socket.off("friendAccepted", onFriendAccepted);
        };
    }, [myname, socketInitialized]);
    // Filter cho tab tìm kiếm
    const filtered = accounts.filter(acc =>
        acc.username.includes(friendInput) &&
        acc.username !== myname &&
        !friends.includes(acc.username) &&
        !requestedFriends.includes(acc.username)
    );
    const addFriendHandler = async (username) => {
        // Kiểm tra trùng lặp trước khi gửi
        if (requestedFriends.includes(username)) {
            Toast.show({
                type: "error",
                text1: "Lỗi",
                text2: "Đã gửi lời mời đến người này rồi",
            });
            return;
        }

        setLoadingFriend(username);
        try {
            await handleAddFriend(username);

            // Không cần cập nhật state ở đây nữa vì đã xử lý trong component cha
            Toast.show({
                type: "success",
                text1: "Thành công",
                text2: `Đã gửi lời mời đến ${username}`,
            });
        } catch (error) {
            Toast.show({
                type: "error",
                text1: "Lỗi",
                text2: "Gửi lời mời thất bại",
            });
        } finally {
            setLoadingFriend(null);
        }
    };

    // const cancelFriendHandler = async (username) => {
    //     setLoadingFriend(username);
    //     try {
    //         await handleWithdrawFriendRequest(username);
    //         // Không cần setState ở đây vì đã xử lý trong socket listener
    //         setRequestedFriends(prev => prev.filter(u => u !== username));
    //         Toast.show({
    //             type: "success",
    //             text1: "Thành công",
    //             text2: `Đã thu hồi lời mời với ${username}`,
    //         });
    //     } catch (error) {
    //         Toast.show({
    //             type: "error",
    //             text1: "Lỗi",
    //             text2: "Thu hồi lời mời thất bại",
    //         });
    //     } finally {
    //         setLoadingFriend(null);
    //     }
    // };
    const cancelFriendHandler = async (username) => {
        setLoadingFriend(username);
        try {
            await handleWithdrawFriendRequest(username);
            // Cập nhật ngay UI (optimistic update)
            setRequestedFriends(prev => prev.filter(u => u !== username));
            Toast.show({ type: "success", text1: "Thành công", text2: `Đã thu hồi lời mời với ${username}` });
        } catch {
            Toast.show({ type: "error", text1: "Lỗi", text2: "Thu hồi thất bại" });
        } finally {
            setLoadingFriend(null);
        }
    };

    const respondToRequestHandler = async (username, accept) => {
        setLoadingFriend(username);
        try {
            await handleRespondToFriendRequest(username, accept);
            setFriendRequests(prev => prev.filter(u => u !== username));

            if (accept) {
                setFriends(prev => [...prev, username]);
                Toast.show({
                    type: "success",
                    text1: "Thành công",
                    text2: `Đã chấp nhận lời mời từ ${username}`,
                });
            } else {
                Toast.show({
                    type: "info",
                    text1: "Thông báo",
                    text2: `Đã từ chối lời mời từ ${username}`,
                });
            }
        } catch (error) {
            Toast.show({
                type: "error",
                text1: "Lỗi",
                text2: accept ? "Chấp nhận thất bại" : "Từ chối thất bại",
            });
        } finally {
            setLoadingFriend(null);
        }
    };

    // Filter accounts cho tab tìm kiếm
    const filteredAccounts = accounts.filter(
        (acc) =>
            acc.username.toLowerCase().includes(friendInput.toLowerCase()) &&
            acc.username !== myname &&
            !friends.includes(acc.username) &&
            !requestedFriends.includes(acc.username)
    );

    // Các hàm render UI giữ nguyên
    const renderSearchTab = () => (
        <>
            <TextInput
                value={friendInput}
                onChangeText={setFriendInput}
                style={styles.input}
                placeholder="Tìm kiếm user..."
            />
            <FlatList
                data={filteredAccounts}
                keyExtractor={(item) => item.username}
                renderItem={({ item }) => (
                    <View style={styles.listItem}>
                        <View>
                            <Text style={styles.username}>{item.username}</Text>
                            <Text style={styles.fullname}>{item.fullname}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => addFriendHandler(item.username)}
                            disabled={loadingFriend === item.username || requestedFriends.includes(item.username)}
                        >
                            {loadingFriend === item.username ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.addButtonText}>Kết bạn</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Không tìm thấy người dùng phù hợp</Text>
                }
            />
        </>
    );

    const renderSentRequestsTab = () => (
        <FlatList
            data={requestedFriends}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => {
                const account = accounts.find(acc => acc.username === item);
                return (
                    <View style={styles.listItem}>
                        <View>
                            <Text style={styles.username}>{item}</Text>
                            {account && <Text style={styles.fullname}>{account.fullname}</Text>}
                        </View>
                        <TouchableOpacity
                            style={styles.withdrawButton}
                            onPress={() => cancelFriendHandler(item)}
                            disabled={loadingFriend === item}
                        >
                            {loadingFriend === item ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.addButtonText}>Thu hồi</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                );
            }}
            ListEmptyComponent={
                <Text style={styles.emptyText}>Không có lời mời đã gửi</Text>
            }
        />
    );

    const renderReceivedRequestsTab = () => (
        <FlatList
            data={friendRequests}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => {
                const account = accounts.find(acc => acc.username === item);
                return (
                    <View style={styles.listItem}>
                        <View>
                            <Text style={styles.username}>{item}</Text>
                            {account && <Text style={styles.fullname}>{account.fullname}</Text>}
                        </View>
                        <View style={styles.requestButtonsContainer}>
                            <TouchableOpacity
                                style={[styles.requestButton, styles.acceptButton]}
                                onPress={() => respondToRequestHandler(item, true)}
                                disabled={loadingFriend === item}
                            >
                                {loadingFriend === item ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.addButtonText}>Chấp nhận</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.requestButton, styles.rejectButton]}
                                onPress={() => respondToRequestHandler(item, false)}
                                disabled={loadingFriend === item}
                            >
                                {loadingFriend === item ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.addButtonText}>Từ chối</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            }}
            ListEmptyComponent={
                <Text style={styles.emptyText}>Không có lời mời đến</Text>
            }
        />
    );

    return (
        <Modal
            transparent
            animationType="fade"
            visible={true}
            onRequestClose={() => setFriendModalVisible(false)}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Quản lý bạn bè</Text>
                        <TouchableOpacity onPress={() => setFriendModalVisible(false)}>
                            <Text style={styles.closeButton}>×</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'search' && styles.activeTab]}
                            onPress={() => setActiveTab('search')}
                        >
                            <Text style={styles.tabText}>Tìm kiếm</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'sent' && styles.activeTab]}
                            onPress={() => setActiveTab('sent')}
                        >
                            <Text style={styles.tabText}>Đã gửi ({requestedFriends.length})</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'received' && styles.activeTab]}
                            onPress={() => setActiveTab('received')}
                        >
                            <Text style={styles.tabText}>Lời mời ({friendRequests.length})</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.contentContainer}>
                        {activeTab === 'search' && renderSearchTab()}
                        {activeTab === 'sent' && renderSentRequestsTab()}
                        {activeTab === 'received' && renderReceivedRequestsTab()}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "90%",
        maxHeight: "80%",
        backgroundColor: "white",
        borderRadius: 10,
        overflow: "hidden",
        elevation: 5,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
    },
    closeButton: {
        fontSize: 24,
        fontWeight: "bold",
    },
    tabContainer: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    tabButton: {
        flex: 1,
        padding: 12,
        alignItems: "center",
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: "#007bff",
    },
    tabText: {
        color: "#333",
        fontWeight: "500",
    },
    contentContainer: {
        paddingHorizontal: 15,
    },
    input: {
        height: 40,
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginVertical: 15,
    },
    listItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    username: {
        fontWeight: "bold",
        fontSize: 16,
    },
    fullname: {
        color: "#666",
        fontSize: 14,
    },
    addButton: {
        backgroundColor: "#007bff",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    withdrawButton: {
        backgroundColor: "#ffc107",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    requestButtonsContainer: {
        flexDirection: "row",
    },
    requestButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        marginLeft: 8,
    },
    acceptButton: {
        backgroundColor: "#28a745",
    },
    rejectButton: {
        backgroundColor: "#dc3545",
    },
    addButtonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 14,
    },
    emptyText: {
        textAlign: "center",
        color: "#666",
        marginVertical: 20,
    },
});

export default FriendModal;