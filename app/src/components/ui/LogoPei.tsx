import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontFamily } from '@/constants/theme';

interface LogoPeiProps {
    tintColor?: string;
    size?: number;
}

export const LogoPei: React.FC<LogoPeiProps> = ({ tintColor = '#171717', size = 24 }) => {
    // Calculamos el tamaño del badge "app" proporcional al tamaño del logo "pei"
    const appFontSize = size ;
    const paddingH = size * 0.15;
    const paddingV = size * 0.01;

    return (
        <View style={styles.container}>
            <Text style={[styles.pei, { color: tintColor, fontSize: size }]}>peIApp</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pei: {
        fontFamily: FontFamily.bold,
        letterSpacing: -1,
    },
    appBadge: {
        borderRadius: 12,
        marginLeft: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appText: {
        fontFamily: FontFamily.bold,
    }
});
