"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { useCitySearch, CitySuggestion } from "@/hooks/useCitySearch";
import { useAddressSearch, AddressSuggestion } from "@/hooks/useAddressSearch";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

interface Props {
  city: string;
  postalCode: string;
  address: string;
  onCityChange: (city: string) => void;
  onAddressChange: (address: string) => void;
  onCitySelect: (city: string, postalCode: string, latitude: number, longitude: number) => void;
  onAddressSelect: (address: string, latitude: number, longitude: number) => void;
}

const inputCls =
  "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:disabled:bg-zinc-900/50 dark:disabled:text-zinc-500";

const labelCls = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default function CityAddressAutocomplete({
  city,
  postalCode,
  address,
  onCityChange,
  onAddressChange,
  onCitySelect,
  onAddressSelect,
}: Props) {
  const { t } = useI18n();
  const [cityFocused, setCityFocused] = useState(false);
  const [addressFocused, setAddressFocused] = useState(false);
  const [selectedCityCode, setSelectedCityCode] = useState("");

  const cityWrapRef = useRef<HTMLDivElement>(null);
  const addressWrapRef = useRef<HTMLDivElement>(null);

  const { suggestions: citySuggestions, isLoading: cityLoading } = useCitySearch(city);
  const { suggestions: addressSuggestions, isLoading: addressLoading } = useAddressSearch(
    address,
    selectedCityCode,
  );

  const showCity = cityFocused && city.length >= 2 && (cityLoading || citySuggestions.length > 0);
  const showAddress =
    addressFocused &&
    address.length >= 3 &&
    !!selectedCityCode &&
    (addressLoading || addressSuggestions.length > 0);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (cityWrapRef.current && !cityWrapRef.current.contains(e.target as Node)) {
        setCityFocused(false);
      }
      if (addressWrapRef.current && !addressWrapRef.current.contains(e.target as Node)) {
        setAddressFocused(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleCityPick = (item: CitySuggestion) => {
    onCitySelect(item.name, item.postalCode, item.latitude, item.longitude);
    setSelectedCityCode(item.cityCode);
    setCityFocused(false);
  };

  const handleAddressPick = (item: AddressSuggestion) => {
    onAddressSelect(item.name, item.latitude, item.longitude);
    setAddressFocused(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div ref={cityWrapRef} className="relative sm:col-span-2">
          <label htmlFor="city" className={labelCls}>
            {t("chantiers.form.city")}
          </label>
          <input
            id="city"
            name="city"
            type="text"
            className={cn(inputCls, "mt-1.5")}
            placeholder="Nancy"
            value={city}
            onChange={(e) => {
              onCityChange(e.target.value);
              if (selectedCityCode) setSelectedCityCode("");
            }}
            onFocus={() => setCityFocused(true)}
            autoComplete="off"
          />

          {showCity ? (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              {cityLoading && citySuggestions.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-zinc-500">
                  <Loader2 size={14} className="animate-spin" />
                  {t("common.loading")}
                </div>
              ) : null}
              {citySuggestions.slice(0, 8).map((item, i) => (
                <button
                  type="button"
                  key={`${item.cityCode}-${item.postalCode}-${i}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleCityPick(item)}
                  className="flex w-full items-center gap-2 border-b border-zinc-100 px-3 py-2 text-left hover:bg-orange-50 dark:border-zinc-800 dark:hover:bg-orange-900/20"
                >
                  <MapPin size={14} className="flex-shrink-0 text-orange-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {item.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {item.postalCode} — {item.department}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <label htmlFor="postal_code" className={labelCls}>
            {t("chantiers.form.postalCode")}
          </label>
          <input
            id="postal_code"
            name="postal_code"
            type="text"
            className={cn(inputCls, "mt-1.5")}
            placeholder="54000"
            value={postalCode}
            disabled
            readOnly
          />
        </div>
      </div>

      {postalCode ? (
        <div ref={addressWrapRef} className="relative">
          <label htmlFor="address" className={labelCls}>
            {t("chantiers.form.address")}
          </label>
          <input
            id="address"
            name="address"
            type="text"
            className={cn(inputCls, "mt-1.5")}
            placeholder="12 Rue de la Paix"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            onFocus={() => setAddressFocused(true)}
            autoComplete="off"
          />

          {showAddress ? (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              {addressLoading && addressSuggestions.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-zinc-500">
                  <Loader2 size={14} className="animate-spin" />
                  {t("common.loading")}
                </div>
              ) : null}
              {addressSuggestions.slice(0, 8).map((item, i) => (
                <button
                  type="button"
                  key={`${item.label}-${i}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAddressPick(item)}
                  className="flex w-full items-center gap-2 border-b border-zinc-100 px-3 py-2 text-left hover:bg-orange-50 dark:border-zinc-800 dark:hover:bg-orange-900/20"
                >
                  <Navigation size={14} className="flex-shrink-0 text-orange-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {item.name}
                    </p>
                    {item.label !== item.name ? (
                      <p className="truncate text-xs text-zinc-500">{item.label}</p>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
