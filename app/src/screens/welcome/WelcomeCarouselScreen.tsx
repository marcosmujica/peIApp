import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, TouchableWithoutFeedback, ImageBackground, StatusBar, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { Colors, FontFamily, Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { Typography } from '@/components/ui/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<AuthStackParamList, 'WelcomeCarousel'>;

const SLIDES = [
    {
        id: '1',
        title: 'Calma\nfinanciera',
        description: 'Todo tu dinero organizado en un solo lugar. Simple, rápido y sin estrés.',
        image: require('../../assets/slide1_pop.jpg'),
    },
    {
        id: '2',
        title: 'Tu negocio,\nen sintonía',
        description: 'Múltiples billeteras para separar lo personal de lo profesional.',
        image: require('../../assets/slide2_pop.jpg'),
    },
    {
        id: '3',
        title: 'Cuentas claras,\nsiempre',
        description: 'Registrá tus deudas, cobros y recibí alertas antes de que venzan tus tickets.',
        image: require('../../assets/slide3_pop.jpg'),
    },
    {
        id: '4',
        title: 'Calma IA,\ntu asistente',
        description: 'Un asistente con inteligencia artificial diseñado para ayudarte a entender y mejorar tus finanzas.',
        image: require('../../assets/slide4_pop.jpg'),
    }
];

const STORY_DURATION = 4000;

export const WelcomeCarouselScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Manejar animación de la barra de progreso
  useEffect(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        goToNextSlide();
      }
    });
  }, [currentIndex]);

  const goToNextSlide = () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      skipToLogin();
    }
  };

  const goToPrevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleTouch = (evt: any) => {
    const x = evt.nativeEvent.locationX;
    if (x < width / 3) {
      goToPrevSlide();
    } else {
      // Avanzar al tocar al centro o derecha
      // Paramos la animación actual que disparará el completion
      progressAnim.stopAnimation(() => {
        goToNextSlide();
      });
    }
  };

  const skipToLogin = () => {
    navigation.navigate('PhoneInput');
  };

  const currentSlide = SLIDES[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ImageBackground source={currentSlide.image} style={styles.imageBackground} resizeMode="cover">
        <View style={styles.gradientOverlay}>
          
          {/* BARRAS DE PROGRESO TIPO STORIES */}
          <View style={[styles.storiesHeader, { top: Math.max(insets.top, 20) }]}>
            {SLIDES.map((_, index) => {
              let widthValue = '0%';
              if (index < currentIndex) {
                widthValue = '100%';
              }
              
              return (
                <View key={index} style={styles.progressBarContainer}>
                  {index === currentIndex ? (
                    <Animated.View
                      style={[
                        styles.progressBarActive,
                        {
                          width: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          })
                        }
                      ]}
                    />
                  ) : (
                    <View style={[styles.progressBarActive, { width: widthValue as any }]} />
                  )}
                </View>
              );
            })}
          </View>

          {/* ÁREA INTERACTIVA PARA PASAR STORIES */}
          <TouchableWithoutFeedback onPress={handleTouch}>
            <View style={styles.touchArea} />
          </TouchableWithoutFeedback>

          {/* CONTENIDO DE TEXTO */}
          <View style={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom, 20) + 80 }]}>
            <Typography variant="headingH1" style={styles.title} color={Colors.white}>
              {currentSlide.title}
            </Typography>
            <Typography variant="bodyLarge" style={styles.description} color={Colors.white}>
              {currentSlide.description}
            </Typography>
          </View>

          {/* BOTÓN INFERIOR SALTAR / EMPEZAR */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
             <TouchableOpacity style={styles.mainBtn} onPress={skipToLogin}>
                <Typography variant="labelBase" color={Colors.textPrimary} style={{ fontWeight: 'bold' }}>
                  {currentIndex === SLIDES.length - 1 ? 'Empezar ahora' : 'Saltar intro'}
                </Typography>
             </TouchableOpacity>
          </View>
          
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  imageBackground: { flex: 1, width: '100%', height: '100%' },
  gradientOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)', // Filtro suave para que el texto contraste
    justifyContent: 'space-between',
  },
  storiesHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 8,
    zIndex: 10,
    gap: 4,
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarActive: {
    height: '100%',
    backgroundColor: Colors.white,
    borderRadius: 2,
  },
  touchArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    zIndex: 5,
    pointerEvents: 'none', // Para que los toques pasen al touchArea
  },
  title: {
    fontSize: 48,
    lineHeight: 52,
    fontFamily: FontFamily.bold,
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  description: {
    fontSize: 18,
    lineHeight: 26,
    opacity: 0.95,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    zIndex: 10,
  },
  mainBtn: {
    backgroundColor: Colors.white,
    height: 56,
    borderRadius: BorderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.cardElevated,
  }
});
