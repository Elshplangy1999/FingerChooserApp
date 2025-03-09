import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';

interface Finger {
  id: string;
  x: number;
  y: number;
  color: Animated.Value;
  scale: Animated.Value;
  rotation: Animated.Value;
  active: boolean;
  dots: {
    angle: number;
    distance: number;
    opacity: Animated.Value;
  }[];
}

interface FingerColors {
  [key: string]: string;
}

export default function GameScreen() {
  const router = useRouter();
  const [fingers, setFingers] = useState<Finger[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const selectionAnimation = useRef(new Animated.Value(0)).current;
  const animationSpeedRef = useRef(100);
  const gameAreaRef = useRef<View>(null);
  const gameAreaDimensions = useRef({ pageX: 0, pageY: 0, width: 0, height: 0, bottom: 0 });
  const tapSoundRef = useRef<Audio.Sound | null>(null);
  const winSoundRef = useRef<Audio.Sound | null>(null);

  const [fingerColors, setFingerColors] = useState<FingerColors>({});

  useEffect(() => {
    async function loadSounds() {
      try {
        const { sound: tapSound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/tap.mp3')
        );
        tapSoundRef.current = tapSound;

        const { sound: winSound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/winner.mp3')
        );
        winSoundRef.current = winSound;
      } catch (error) {
        console.error('Failed to load sounds', error);
      }
    }

    loadSounds();

    return () => {
      if (tapSoundRef.current) {
        tapSoundRef.current.unloadAsync();
      }
      if (winSoundRef.current) {
        winSoundRef.current.unloadAsync();
      }
    };
  }, []);

  const playTapSound = async () => {
    try {
      if (tapSoundRef.current) {
        await tapSoundRef.current.replayAsync();
      }
    } catch (error) {
      console.error('Failed to play tap sound', error);
    }
  };

  const playWinnerSound = async () => {
    try {
      if (winSoundRef.current) {
        await winSoundRef.current.replayAsync();
      }
    } catch (error) {
      console.error('Failed to play winner sound', error);
    }
  };

  const generateDots = () => {
    const dots = [];
    const numDots = 8;
    for (let i = 0; i < numDots; i++) {
      const angle = (i * 2 * Math.PI) / numDots;
      dots.push({
        angle,
        distance: 95,
        opacity: new Animated.Value(0.5),
      });
    }
    return dots;
  };

  useEffect(() => {
    const measureGameArea = () => {
      if (gameAreaRef.current) {
        gameAreaRef.current.measure((x, y, width, height, pageX, pageY) => {
          gameAreaDimensions.current = {
            pageX,
            pageY,
            width,
            height,
            bottom: pageY + height
          };
        });
      }
    };

    measureGameArea();
    const subscription = Dimensions.addEventListener('change', measureGameArea);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    fingers.forEach(finger => {
      if (finger.active) {
        finger.dots.forEach((dot, index) => {
          Animated.loop(
            Animated.sequence([
              Animated.timing(dot.opacity, {
                toValue: 1,
                duration: 600 + index * 100,
                useNativeDriver: true,
              }),
              Animated.timing(dot.opacity, {
                toValue: 0.2,
                duration: 600 + index * 100,
                useNativeDriver: true,
              }),
            ])
          ).start();
        });
      }
    });
  }, [fingers]);

  useEffect(() => {
    fingers.forEach(finger => {
      if (finger.active) {
        Animated.loop(
          Animated.timing(finger.rotation, {
            toValue: 1,
            duration: 5000,
            useNativeDriver: true,
          })
        ).start();
      }
    });
  }, [fingers]);

  const isTouchInGameArea = (pageX: number, pageY: number) => {
    const { pageX: areaX, pageY: areaY, width, height, bottom } = gameAreaDimensions.current;
    const buttonAreaTop = bottom - 70;

    return (
      pageX >= areaX &&
      pageX <= areaX + width &&
      pageY >= areaY &&
      pageY <= bottom &&
      pageY < buttonAreaTop
    );
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt) => {
      const touch = evt.nativeEvent.touches[0];
      const { pageY, bottom } = gameAreaDimensions.current;
      return touch.pageY >= pageY && touch.pageY <= bottom - 80;
    },

    onMoveShouldSetPanResponder: (evt) => {
      const touch = evt.nativeEvent.touches[0];
      return isTouchInGameArea(touch.pageX, touch.pageY);
    },

    onPanResponderTerminationRequest: () => false,

    onPanResponderGrant: (evt) => {
      if (selecting) return;

      const touches = evt.nativeEvent.touches;

      const validTouches = touches.filter(touch =>
        isTouchInGameArea(touch.pageX, touch.pageY)
      );

      if (validTouches.length > 0) {
        playTapSound();
      }
      const currentTouches = validTouches.map(touch => {
        const fingerId = `${touch.identifier}`;
        setFingerColors(prev => ({
          ...prev,
          [fingerId]: '#00a2ff'
        }));

        return {
          id: fingerId,
          x: touch.pageX,
          y: touch.pageY,
          color: new Animated.Value(0),
          scale: new Animated.Value(1),
          rotation: new Animated.Value(0),
          active: true,
          dots: generateDots(),
        };
      });

      setFingers(prev => {
        const touchIds = currentTouches.map(t => t.id);
        const remainingFingers = prev.filter(f => !touchIds.includes(f.id) && f.active);
        return [...remainingFingers, ...currentTouches];
      });
    },

    onPanResponderMove: (evt) => {
      if (!selecting) {
        const touches = evt.nativeEvent.touches;

        setFingers(prev => {
          return prev.map(finger => {
            const matchingTouch = touches.find(t => `${t.identifier}` === finger.id);
            if (matchingTouch && isTouchInGameArea(matchingTouch.pageX, matchingTouch.pageY)) {
              return {
                ...finger,
                x: matchingTouch.pageX,
                y: matchingTouch.pageY,
              };
            }
            return finger;
          });
        });
      }
    },

    onPanResponderRelease: (evt) => {

    },

    onPanResponderTerminate: (evt) => {

    },
  });

  const updateFingerColors = (activeFingers: Finger[], currentIndex: number): void => {
    const updatedColors: FingerColors = {};

    activeFingers.forEach((finger, index) => {
      if (index === currentIndex) {
        updatedColors[finger.id] = '#ff9500';
      } else {
        updatedColors[finger.id] = '#00a2ff';
      }
    });

    setFingerColors(prev => ({
      ...prev,
      ...updatedColors
    }));
  };

  const selectRandomFinger = () => {
    const activeFingers = fingers.filter(f => f.active);
    if (activeFingers.length === 0 || selecting) return;

    setSelecting(true);
    setWinnerIndex(null);

    activeFingers.forEach(finger => {
      Animated.spring(finger.scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    });

    selectionAnimation.setValue(0);

    const selectionSpeed = 200;

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % activeFingers.length;
      updateFingerColors(activeFingers, currentIndex);
    }, selectionSpeed);

    const numberOfCycles = 3;
    const selectionTime = activeFingers.length * selectionSpeed * numberOfCycles;

    setTimeout(() => {
      clearInterval(interval);

      const randomIndex = Math.floor(Math.random() * activeFingers.length);
      setWinnerIndex(randomIndex);

      playWinnerSound();

      const winner = activeFingers[randomIndex];

      Animated.sequence([
        Animated.spring(winner.scale, {
          toValue: 1.3,
          useNativeDriver: true,
        }),
        Animated.spring(winner.scale, {
          toValue: 1.2,
          useNativeDriver: true,
        }),
      ]).start();

      const updatedColors: FingerColors = {};
      activeFingers.forEach((finger, index) => {
        if (index === randomIndex) {
          updatedColors[finger.id] = '#ff2d55';
        } else {
          updatedColors[finger.id] = '#00a2ff';
        }
      });

      setFingerColors(prev => ({
        ...prev,
        ...updatedColors
      }));

      let blinkCount = 0;
      const blinkInterval = setInterval(() => {
        blinkCount++;

        setFingerColors(prev => ({
          ...prev,
          [winner.id]: blinkCount % 2 === 0 ? '#ff2d55' : '#ff0055'
        }));

        if (blinkCount >= 6) {
          clearInterval(blinkInterval);
        }
      }, 300);

      setTimeout(() => {
        setSelecting(false);
      }, 2000);
    }, selectionTime);
  };

  const handleRestart = () => {
    setFingers([]);
    setSelecting(false);
    setWinnerIndex(null);
    setFingerColors({});
  };

  const handleBack = () => {
    router.back();
  };

  const getBorderColor = (fingerId: string): string => {
    if (fingerColors[fingerId] === '#ff2d55' || fingerColors[fingerId] === '#ff0055') {
      return '#ffcc00';
    }
    return 'white';
  };

  const getBorderWidth = (fingerId: string): number => {
    if (fingerColors[fingerId] === '#ff2d55' || fingerColors[fingerId] === '#ff0055') {
      return 6;
    }
    return 4;
  };

  const handleButtonPress = (action: () => void) => {
    return () => {
      action();
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      <View ref={gameAreaRef} style={styles.gameAreaContainer}>
        <View style={styles.touchArea} {...panResponder.panHandlers}>
          {fingers.filter(f => f.active).map((finger) => (
            <View key={finger.id} style={{ position: 'absolute', left: finger.x - 95, top: finger.y - 95 }}>
              {finger.dots.map((dot, index) => (
                <Animated.View
                  key={`dot-${index}`}
                  style={{
                    position: 'absolute',
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: '#00a2ff',
                    opacity: dot.opacity,
                    transform: [
                      {
                        translateX: finger.rotation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [
                            Math.cos(dot.angle) * dot.distance,
                            Math.cos(dot.angle + 2 * Math.PI) * dot.distance
                          ]
                        })
                      },
                      {
                        translateY: finger.rotation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [
                            Math.sin(dot.angle) * dot.distance,
                            Math.sin(dot.angle + 2 * Math.PI) * dot.distance
                          ]
                        })
                      },
                    ],
                    left: 95,
                    top: 95,
                  }}
                />
              ))}

              <Animated.View
                style={[
                  styles.fingerCircle,
                  {
                    transform: [
                      { scale: finger.scale },
                      {
                        rotate: finger.rotation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg']
                        })
                      }
                    ],
                    backgroundColor: fingerColors[finger.id] || '#00a2ff',
                    borderColor: getBorderColor(finger.id),
                    borderWidth: getBorderWidth(finger.id),
                  },
                ]}
                pointerEvents="none"
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.buttonContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={[
            styles.button,
            fingers.filter(f => f.active).length === 0 && styles.disabledButton
          ]}
          onPress={handleButtonPress(selectRandomFinger)}
          disabled={fingers.filter(f => f.active).length === 0 || selecting}
        >
          <Text style={styles.buttonText}>Pick Finger</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleButtonPress(handleRestart)}>
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleButtonPress(handleBack)}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  gameAreaContainer: {
    flex: 1,
    position: 'relative',
    marginBottom: 80,
  },
  touchArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 80,
  },
  fingerCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    left: 5,
    top: 5,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 7,
    zIndex: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    zIndex: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});