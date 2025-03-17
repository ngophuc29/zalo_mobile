import React from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet
} from 'react-native';

const GroupChatModal = ({
    groupName,
    setGroupName,
    accounts,
    selectedMembers,
    setSelectedMembers,
    myname,
    setGroupModalVisible,
    handleCreateGroup,
}) => {
    return (
        <Modal
            transparent={true}
            animationType="fade"
            visible={true}
            onRequestClose={() => setGroupModalVisible(false)}
        >
            <View
                style={styles.modalOverlay}
                activeOpacity={1}
                onPressOut={() => setGroupModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Tạo Nhóm Chat</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Tên nhóm chat"
                        value={groupName}
                        onChangeText={setGroupName}
                    />
                    <Text style={styles.subtitle}>Chọn thành viên:</Text>
                    <ScrollView style={styles.membersContainer}>
                        {accounts
                            .filter((acc) => acc.username !== myname)
                            .map((account, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.memberItem}
                                    onPress={() => {
                                        const username = account.username;
                                        setSelectedMembers((prev) =>
                                            prev.includes(username)
                                                ? prev.filter((u) => u !== username)
                                                : [...prev, username]
                                        );
                                    }}
                                >
                                    <Text style={styles.memberText}>{account.username}</Text>
                                    {selectedMembers.includes(account.username) && (
                                        <Text style={styles.checkMark}>✔</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                    </ScrollView>
                    <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
                        <Text style={styles.createButtonText}>Tạo Nhóm</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        padding: 8,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 5,
    },
    membersContainer: {
        maxHeight: 200,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        padding: 5,
    },
    memberItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    memberText: {
        fontSize: 16,
    },
    checkMark: {
        fontSize: 16,
        color: 'green',
    },
    createButton: {
        backgroundColor: '#007bff',
        padding: 10,
        borderRadius: 4,
        alignItems: 'center',
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
    },
});

export default GroupChatModal;
