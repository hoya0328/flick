import { createElement, useState } from 'react';
import { View } from 'react-native';
import { DesignVector } from '@/components/design-vector';
import { ratingMessage } from './light-flow';

export function RatingControl({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  const [focused, setFocused] = useState(false);
  return <View style={{ width: 267, height: 51, alignSelf: 'center', outlineWidth: focused ? 2 : 0, outlineStyle: 'solid', outlineColor: '#F8233C', outlineOffset: 5, borderRadius: 8 }}>
    <DesignVector name="ratingStars" tint="#E5E7EB" style={{ position: 'absolute' }} />
    <View style={{ width: `${(value ?? 0) / 5 * 100}%`, height: 51, overflow: 'hidden', position: 'absolute' }}><DesignVector name="ratingStars" /></View>
    {createElement('input', { type: 'range', onFocus: () => setFocused(true), onBlur: () => setFocused(false), min: 0.5, max: 5, step: 0.5, value: value ?? 0.5, 'aria-label': '영화 별점', 'aria-valuetext': `${value ?? 0}점. ${ratingMessage(value)}`, onChange: (event: { target: { value: string } }) => onChange(Number(event.target.value)), onPointerDown: (event: { currentTarget: HTMLInputElement; clientX: number }) => { const rect = event.currentTarget.getBoundingClientRect(); onChange(Math.max(0.5, Math.min(5, Math.ceil((event.clientX - rect.left) / rect.width * 10) / 2))); }, style: { position: 'absolute', inset: 0, opacity: 0.001, width: '100%', height: 51, margin: 0, cursor: 'pointer', touchAction: 'none' } })}
  </View>;
}
