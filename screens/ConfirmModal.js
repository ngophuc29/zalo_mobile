import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ConfirmModal = ({ visible, message, onConfirm, onCancel }) => {
    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.message}>{message}</Text>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                            <Text style={styles.buttonText}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
                            <Text style={styles.buttonText}>Đồng ý</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
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
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '80%',
    },
    message: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    cancelButton: {
        backgroundColor: '#dc3545',
        padding: 10,
        borderRadius: 5,
    },
    confirmButton: {
        backgroundColor: '#28a745',
        padding: 10,
        borderRadius: 5,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default ConfirmModal;
