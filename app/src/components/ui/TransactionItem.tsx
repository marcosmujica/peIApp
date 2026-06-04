import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Image,
} from "react-native";
import {
  Colors,
  FontFamily,
} from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { normalizeUrl } from "@/utils/url.util";

/**
 * TransactionItem - matches the new Dashboard style
 */

interface TransactionItemProps {
  title: string;
  subtitle?: string;
  amount?: string;
  currency?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  status?: string;
  amountColor?: string;
  rating?: number;
  avatarUrl?: string;
  overdueDays?: number;
  hasUnreadChat?: boolean;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  title,
  subtitle,
  amount,
  currency = 'UYU',
  iconName = "document-text",
  iconColor = "#363630",
  onPress,
  style,
  status,
  amountColor,
  rating,
  avatarUrl,
  overdueDays,
  hasUnreadChat,
}) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  const [imageError, setImageError] = React.useState(false);

  return (
    <Wrapper
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.container, style]}
    >
      <View style={styles.iconContainer}>
        {avatarUrl && !imageError ? (
          <Image 
            source={{ uri: normalizeUrl(avatarUrl) }} 
            style={{ width: '100%', height: '100%', borderRadius: 18 }} 
            resizeMode="cover" 
            onError={() => setImageError(true)}
          />
        ) : (
          <Ionicons name={iconName} size={16} color={iconColor} />
        )}
      </View>

      <View style={styles.textColumn}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
            <Text style={[styles.title, hasUnreadChat && { fontWeight: '700', color: '#111827' }]} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <View style={styles.right}>
            {amount ? (
              <View style={styles.amountContainer}>
                <Text style={styles.currency}>{currency}</Text>
                <Text style={[styles.amount, amountColor ? { color: amountColor } : null]}>
                  {amount}
                </Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={14} color="#b7b7ae" style={{ marginTop: 4 }} />
          </View>
        </View>

        {rating && rating > 0 ? (
          <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons key={s} name={rating >= s ? "star" : "star-outline"} size={10} color={rating >= s ? "#F59E0B" : "#b7b7ae"} />
            ))}
          </View>
        ) : null}

        <View style={styles.subtitleRow}>
          {hasUnreadChat && <View style={[styles.unreadDot, { marginLeft: 0, marginRight: 6 }]} />}
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          {status && (
            <Text style={[styles.statusText, { color: status === 'overdue' ? Colors.destructive : status === 'cancelled' ? Colors.destructive : (status === 'completed' ? Colors.primary : Colors.textTertiary) }]}>
              • {status === 'completed' ? 'PAGADO' : status === 'cancelled' ? 'CANCELADO' : status === 'overdue' ? `ATRASADO ${overdueDays ? `(${overdueDays}d)` : ''}` : 'PENDIENTE'}
            </Text>
          )}
        </View>
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    paddingVertical: 14,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3a9e76',
    marginLeft: 6,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f2f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textColumn: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  title: {
    fontFamily: 'PlusJakarta-Medium',
    fontSize: 17,
    lineHeight: 22,
    color: "#363630",
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 18,
    color: "#b7b7ae",
  },
  statusText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currency: {
    fontFamily: 'PlusJakarta-Medium',
    fontSize: 12,
    color: "#b7b7ae",
  },
  amount: {
    fontFamily: 'PlusJakarta-Bold',
    fontSize: 17,
    lineHeight: 24,
    color: "#363630",
  },
});

