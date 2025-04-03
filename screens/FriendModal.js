import React from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
} from "react-native";

const FriendModal = ({
    friendInput,
    setFriendInput,
    accounts,
    myname,
    friends,
    setFriendModalVisible,
    handleAddFriend,
}) => {
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
                        <Text style={styles.title}>Kết bạn</Text>
                        <TouchableOpacity onPress={() => setFriendModalVisible(false)}>
                            <Text style={styles.closeButton}>×</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        value={friendInput}
                        onChangeText={setFriendInput}
                        style={styles.input}
                        placeholder="Tìm kiếm user..."
                    />
                    <FlatList
                        data={accounts.filter(
                            (acc) =>
                                acc.username.toLowerCase().includes(friendInput.toLowerCase()) &&
                                acc.username !== myname &&
                                !friends.includes(acc.username)
                        )}
                        keyExtractor={(item) => item.username}
                        renderItem={({ item }) => (
                            <View style={styles.listItem}>
                                <Text>
                                    <Text style={styles.username}>{item.username}</Text> - {item.fullname}
                                </Text>
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => handleAddFriend(item.username)}
                                >
                                    <Text style={styles.addButtonText}>Kết bạn</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
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
        width: "80%",
        backgroundColor: "white",
        borderRadius: 10,
        padding: 20,
        elevation: 5,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
    },
    closeButton: {
        fontSize: 22,
        fontWeight: "bold",
    },
    input: {
        height: 40,
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    listItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
    username: {
        fontWeight: "bold",
    },
    addButton: {
        backgroundColor: "blue",
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
    },
    addButtonText: {
        color: "white",
        fontWeight: "bold",
    },
});

export default FriendModal;
