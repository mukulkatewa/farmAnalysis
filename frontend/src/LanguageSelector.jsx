import React from "react";
import i18n from "i18next";
import { useTranslation } from "react-i18next";

function LanguageSelector() {
  const { t } = useTranslation();

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">{t("select_language")}:</span>
      <select 
        onChange={changeLanguage} 
        defaultValue={i18n.language}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:border-green-300 focus:ring-2 focus:ring-green-400 focus:outline-none cursor-pointer transition-colors"
      >
        <option value="en">{t("language_en")}</option>
        <option value="hi">{t("language_hi")}</option>
        {/* <option value="bn">{t("language_bn")}</option> */}
      </select>
    </div>
  );
}

export default LanguageSelector;

