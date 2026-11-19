import type { PropsWithChildren, RefObject } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View, type LayoutChangeEvent, type TextInputProps } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { homeFont } from '@/components/home-ui';
import { authBrandAsset } from './auth-brand-asset';
import { authDesign as d } from './welcome-model';

export function AuthBrand({ topInset = 0 }: {topInset?: number}) {
  return <View accessibilityRole="header" accessibilityLabel="FLICK" testID="auth-brand" style={[authStyles.brand, {marginTop: Math.max(0, d.logoTop - topInset)}]}><SvgXml xml={authBrandAsset.xml} /></View>;
}

export function AuthField({ label, inputRef, error, onLayout, ...props }: TextInputProps & {label: string; inputRef: RefObject<TextInput | null>; error?: string; onLayout?: (event: LayoutChangeEvent) => void}) {
  return <View onLayout={onLayout} style={authStyles.field}>
    <TextInput {...props} ref={inputRef} accessibilityLabel={label} accessibilityHint={error} aria-invalid={Boolean(error)} placeholderTextColor={d.muted} style={[authStyles.input, Platform.OS === 'web' ? {outlineOffset: -2} : null, error ? authStyles.inputError : null]} />
    {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={authStyles.error}>{error}</Text> : null}
  </View>;
}

export function AuthAction({ label, onPress, busy, disabled, secondary = false }: {label: string; onPress: () => void; busy?: boolean; disabled?: boolean; secondary?: boolean}) {
  return <Pressable accessibilityRole="button" accessibilityState={{disabled: Boolean(disabled || busy), busy: Boolean(busy)}} disabled={disabled || busy} onPress={onPress} style={({pressed})=>[authStyles.action, secondary && authStyles.secondary, (disabled || busy) && authStyles.disabled, pressed && authStyles.pressed]}>
    {busy ? <ActivityIndicator accessibilityLabel="처리 중" color={secondary ? d.primary : '#FFFFFF'} /> : <Text style={[authStyles.actionText, secondary && authStyles.secondaryText]}>{label}</Text>}
  </Pressable>;
}

export function AuthTextButton({ children, onPress, disabled, label }: PropsWithChildren<{onPress: () => void; disabled?: boolean; label?: string}>) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled: Boolean(disabled)}} disabled={disabled} onPress={onPress} style={({pressed})=>[authStyles.textButton, pressed && authStyles.pressed, disabled && authStyles.disabled]}><Text style={authStyles.textButtonText}>{children}</Text></Pressable>;
}

export const authStyles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: d.background}, scroll: {flexGrow: 1},
  frame: {width: '100%', maxWidth: d.frameWidth, minHeight: d.baseHeight, alignSelf: 'center', paddingBottom: 72},
  brand: {width: d.logoWidth, height: d.logoHeight, alignSelf: 'center', marginTop: d.logoTop},
  form: {marginTop: d.formTopGap, paddingLeft: d.leftInset, paddingRight: d.rightInset, gap: d.fieldGap},
  field: {gap: 6}, input: {height: d.controlHeight, borderRadius: d.controlRadius, borderWidth: 0, backgroundColor: d.surface, paddingLeft: d.inputInset, paddingRight: d.inputInset, paddingVertical: 0, fontFamily: homeFont, fontSize: d.fieldFontSize, fontWeight: '500', letterSpacing: -.16, color: d.text},
  inputError: {borderWidth: 1, borderColor: d.primary}, error: {fontFamily: homeFont, fontSize: 12, lineHeight: 18, color: '#D71B34', paddingHorizontal: 16},
  action: {height: d.controlHeight, borderRadius: d.controlRadius, backgroundColor: d.primary, alignItems: 'center', justifyContent: 'center', width: '100%'},
  actionText: {fontFamily: homeFont, fontSize: d.buttonFontSize, fontWeight: '600', lineHeight: 24, letterSpacing: -.2, color: '#FFFFFF'},
  secondary: {backgroundColor: d.surface}, secondaryText: {color: d.primary}, disabled: {opacity: .5}, pressed: {opacity: .75},
  links: {height: 44, marginTop: 14.5, flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 26},
  linkDivider: {height: 15, width: 1, backgroundColor: d.muted}, textButton: {minHeight: 44, justifyContent: 'center', alignItems: 'center'},
  textButtonText: {fontFamily: homeFont, fontSize: 16, fontWeight: '500', lineHeight: 19, letterSpacing: -.16, color: d.muted},
  guest: {marginTop: 72.5, paddingLeft: d.leftInset, paddingRight: d.rightInset},
  guestCaption: {height: 36.73585, justifyContent: 'center', alignItems: 'center', marginBottom: 12.26415},
  guestCaptionText: {fontFamily: homeFont, fontSize: 16, fontWeight: '500', lineHeight: 19, letterSpacing: -.16, color: d.muted, textAlign: 'center'},
  notice: {paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: '#FFF1F2'}, success: {backgroundColor: '#F0FDF4'},
  noticeText: {fontFamily: homeFont, fontSize: 13, lineHeight: 20, color: '#B91C38'}, successText: {color: '#166534'},
});
