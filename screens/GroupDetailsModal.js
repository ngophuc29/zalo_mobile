import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet
} from 'react-native';

const GroupDetailsModal = ({
    groupInfo,
    setGroupDetailsVisible,
    myname,
    handleRemoveGroupMember,
    handleTransferGroupOwner,
    handleAssignDeputy,
    handleCancelDeputy,
    handleAddGroupMember,
    handleLeaveGroup,
    handleDisbandGroup,
}) => {
    const [newMember, setNewMember] = useState("");

    return (
        <Modal
            transparent={true}
            animationType="fade"
            visible={true}
            onRequestClose={() => setGroupDetailsVisible(false)}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPressOut={() => setGroupDetailsVisible(false)}
            >
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Group Details</Text>
                        <TouchableOpacity onPress={() => setGroupDetailsVisible(false)}>
                            <Text style={styles.close}>X</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.body}>
                        <View style={styles.infoSection}>
                            <Text style={styles.infoText}>
                                <Text style={styles.label}>Group Name: </Text>
                                {groupInfo.groupName}
                            </Text>
                            <Text style={styles.infoText}>
                                <Text style={styles.label}>Owner: </Text>
                                {groupInfo.owner}
                            </Text>
                            <Text style={styles.infoText}>
                                <Text style={styles.label}>Deputies: </Text>
                                {groupInfo.deputies.join(", ")}
                            </Text>
                            <Text style={styles.infoText}>
                                <Text style={styles.label}>Members: </Text>
                                {groupInfo.members.join(", ")}
                            </Text>
                        </View>
                        <ScrollView style={styles.memberList}>
                            {groupInfo.members
                                .filter(member => member !== myname)
                                .map((member, idx) => (
                                    <View key={idx} style={styles.memberRow}>
                                        <Text style={styles.memberName}>{member}</Text>
                                        {(groupInfo.owner === myname ||
                                            (groupInfo.deputies && groupInfo.deputies.includes(myname))) &&
                                            member !== groupInfo.owner && (
                                                <TouchableOpacity
                                                    style={styles.actionButton}
                                                    onPress={() => handleRemoveGroupMember(groupInfo.roomId, member)}
                                                >
                                                    <Text style={styles.actionText}>Remove</Text>
                                                </TouchableOpacity>
                                            )}
                                        {groupInfo.owner === myname && member !== groupInfo.owner && (
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleTransferGroupOwner(groupInfo.roomId, member)}
                                            >
                                                <Text style={styles.actionText}>Transfer</Text>
                                            </TouchableOpacity>
                                        )}
                                        {groupInfo.owner === myname && !groupInfo.deputies.includes(member) && (
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleAssignDeputy(groupInfo.roomId, member)}
                                            >
                                                <Text style={styles.actionText}>Assign Deputy</Text>
                                            </TouchableOpacity>
                                        )}
                                        {groupInfo.owner === myname && groupInfo.deputies.includes(member) && (
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleCancelDeputy(groupInfo.roomId, member)}
                                            >
                                                <Text style={styles.actionText}>Cancel Deputy</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                        </ScrollView>
                        <View style={styles.addMemberSection}>
                            <TextInput
                                style={styles.input}
                                placeholder="New member username"
                                value={newMember}
                                onChangeText={setNewMember}
                                onSubmitEditing={() => {
                                    handleAddGroupMember(newMember);
                                    setNewMember("");
                                }}
                            />
                            <TouchableOpacity
                                style={styles.addMemberButton}
                                onPress={() => {
                                    handleAddGroupMember(newMember);
                                    setNewMember("");
                                }}
                            >
                                <Text style={styles.addMemberText}>Add Member</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.groupActions}>
                            <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
                                <Text style={styles.leaveText}>Leave Group</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.disbandButton} onPress={handleDisbandGroup}>
                                <Text style={styles.disbandText}>Disband Group</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    close: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'red',
    },
    body: {
        flex: 1,
    },
    infoSection: {
        marginBottom: 10,
    },
    label: {
        fontWeight: 'bold',
    },
    infoText: {
        fontSize: 16,
        marginBottom: 5,
    },
    memberList: {
        maxHeight: 200,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        padding: 5,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    memberName: {
        fontSize: 16,
        flex: 1,
    },
    actionButton: {
        backgroundColor: '#007bff',
        paddingHorizontal: 5,
        paddingVertical: 3,
        borderRadius: 3,
        marginLeft: 5,
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
    },
    addMemberSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 4,
        padding: 8,
    },
    addMemberButton: {
        backgroundColor: '#007bff',
        padding: 10,
        borderRadius: 4,
        marginLeft: 10,
    },
    addMemberText: {
        color: '#fff',
        fontSize: 16,
    },
    groupActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    leaveButton: {
        backgroundColor: '#ffc107',
        padding: 10,
        borderRadius: 4,
        flex: 0.48,
        alignItems: 'center',
    },
    leaveText: {
        color: '#fff',
        fontSize: 16,
    },
    disbandButton: {
        backgroundColor: '#dc3545',
        padding: 10,
        borderRadius: 4,
        flex: 0.48,
        alignItems: 'center',
    },
    disbandText: {
        color: '#fff',
        fontSize: 16,
    },
});

export default GroupDetailsModal;
