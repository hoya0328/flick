import { useId } from 'react';
import { normalizeRatio } from './explore-model';
export function RatioControl({ value, onChange, onCommit }: { value: number; onChange: (value: number) => void; onCommit?: (value: number) => void }) {
  const id = 'discovery-ratio-' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return <>
    <style>{`#${id}{-webkit-appearance:none;appearance:none;height:30px;background:transparent;cursor:pointer;width:100%;margin:0;display:block;}#${id}:focus-visible{outline:2px solid #A31025;outline-offset:5px;border-radius:4px;}#${id}::-webkit-slider-runnable-track{height:5px;border-radius:4px;background:linear-gradient(to right,#F8233C ${value}%,#E5E7EB ${value}%);}#${id}::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border:1px solid #D1D5DB;border-radius:50%;background:white;margin-top:-7.5px;box-shadow:0 1px 3px #0001;}#${id}::-moz-range-track{height:5px;border-radius:4px;background:#E5E7EB;}#${id}::-moz-range-progress{height:5px;border-radius:4px;background:#F8233C;}#${id}::-moz-range-thumb{width:18px;height:18px;border:1px solid #D1D5DB;border-radius:50%;background:white;}`}</style>
    <input id={id} type="range" min={0} max={100} step={10} value={value} aria-label="낯선 영화 추천 비율" aria-valuetext={`낯선 영화 ${value}%, 익숙한 영화 ${100 - value}%`} onChange={event => onChange(normalizeRatio(event.currentTarget.value))} onPointerUp={event => onCommit?.(normalizeRatio(event.currentTarget.value))} onKeyUp={event => onCommit?.(normalizeRatio(event.currentTarget.value))} />
  </>;
}
