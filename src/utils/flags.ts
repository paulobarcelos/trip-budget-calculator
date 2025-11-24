export function getCurrencyFlag(currencyCode: string): string {
    const code = currencyCode.toUpperCase();

    // Map of currency codes to flag emojis
    const currencyFlags: Record<string, string> = {
        AED: '🇦🇪', // United Arab Emirates Dirham
        AFN: '🇦🇫', // Afghan Afghani
        ALL: '🇦🇱', // Albanian Lek
        AMD: '🇦🇲', // Armenian Dram
        ANG: '🇨🇼', // Netherlands Antillean Guilder
        AOA: '🇦🇴', // Angolan Kwanza
        ARS: '🇦🇷', // Argentine Peso
        AUD: '🇦🇺', // Australian Dollar
        AWG: '🇦🇼', // Aruban Florin
        AZN: '🇦🇿', // Azerbaijani Manat
        BAM: '🇧🇦', // Bosnia-Herzegovina Convertible Mark
        BBD: '🇧🇧', // Barbadian Dollar
        BDT: '🇧🇩', // Bangladeshi Taka
        BGN: '🇧🇬', // Bulgarian Lev
        BHD: '🇧🇭', // Bahraini Dinar
        BIF: '🇧🇮', // Burundian Franc
        BMD: '🇧🇲', // Bermudan Dollar
        BND: '🇧🇳', // Brunei Dollar
        BOB: '🇧🇴', // Bolivian Boliviano
        BRL: '🇧🇷', // Brazilian Real
        BSD: '🇧🇸', // Bahamian Dollar
        BTC: '₿',   // Bitcoin
        BTN: '🇧🇹', // Bhutanese Ngultrum
        BWP: '🇧🇼', // Botswanan Pula
        BYN: '🇧🇾', // Belarusian Ruble
        BZD: '🇧🇿', // Belize Dollar
        CAD: '🇨🇦', // Canadian Dollar
        CDF: '🇨🇩', // Congolese Franc
        CHF: '🇨🇭', // Swiss Franc
        CLP: '🇨🇱', // Chilean Peso
        CNY: '🇨🇳', // Chinese Yuan
        COP: '🇨🇴', // Colombian Peso
        CRC: '🇨🇷', // Costa Rican Colón
        CUP: '🇨🇺', // Cuban Peso
        CVE: '🇨🇻', // Cape Verdean Escudo
        CZK: '🇨🇿', // Czech Republic Koruna
        DJF: '🇩🇯', // Djiboutian Franc
        DKK: '🇩🇰', // Danish Krone
        DOP: '🇩🇴', // Dominican Peso
        DZD: '🇩🇿', // Algerian Dinar
        EGP: '🇪🇬', // Egyptian Pound
        ERN: '🇪🇷', // Eritrean Nakfa
        ETB: '🇪🇹', // Ethiopian Birr
        EUR: '🇪🇺', // Euro
        FJD: '🇫🇯', // Fijian Dollar
        GBP: '🇬🇧', // British Pound Sterling
        GEL: '🇬🇪', // Georgian Lari
        GHS: '🇬🇭', // Ghanaian Cedi
        GMD: '🇬🇲', // Gambian Dalasi
        GNF: '🇬🇳', // Guinean Franc
        GTQ: '🇬🇹', // Guatemalan Quetzal
        GYD: '🇬🇾', // Guyanaese Dollar
        HKD: '🇭🇰', // Hong Kong Dollar
        HNL: '🇭🇳', // Honduran Lempira
        HRK: '🇭🇷', // Croatian Kuna
        HTG: '🇭🇹', // Haitian Gourde
        HUF: '🇭🇺', // Hungarian Forint
        IDR: '🇮🇩', // Indonesian Rupiah
        ILS: '🇮🇱', // Israeli New Sheqel
        INR: '🇮🇳', // Indian Rupee
        IQD: '🇮🇶', // Iraqi Dinar
        IRR: '🇮🇷', // Iranian Rial
        ISK: '🇮🇸', // Icelandic Króna
        JMD: '🇯🇲', // Jamaican Dollar
        JOD: '🇯🇴', // Jordanian Dinar
        JPY: '🇯🇵', // Japanese Yen
        KES: '🇰🇪', // Kenyan Shilling
        KGS: '🇰🇬', // Kyrgystani Som
        KHR: '🇰🇭', // Cambodian Riel
        KMF: '🇰🇲', // Comorian Franc
        KRW: '🇰🇷', // South Korean Won
        KWD: '🇰🇼', // Kuwaiti Dinar
        KYD: '🇰🇾', // Cayman Islands Dollar
        KZT: '🇰🇿', // Kazakhstani Tenge
        LAK: '🇱🇦', // Laotian Kip
        LBP: '🇱🇧', // Lebanese Pound
        LKR: '🇱🇰', // Sri Lankan Rupee
        LRD: '🇱🇷', // Liberian Dollar
        LSL: '🇱🇸', // Lesotho Loti
        LYD: '🇱🇾', // Libyan Dinar
        MAD: '🇲🇦', // Moroccan Dirham
        MDL: '🇲🇩', // Moldovan Leu
        MGA: '🇲🇬', // Malagasy Ariary
        MKD: '🇲🇰', // Macedonian Denar
        MMK: '🇲🇲', // Myanma Kyat
        MNT: '🇲🇳', // Mongolian Tugrik
        MOP: '🇲🇴', // Macanese Pataca
        MRU: '🇲🇷', // Mauritanian Ouguiya
        MUR: '🇲🇺', // Mauritian Rupee
        MVR: '🇲🇻', // Maldivian Rufiyaa
        MWK: '🇲🇼', // Malawian Kwacha
        MXN: '🇲🇽', // Mexican Peso
        MYR: '🇲🇾', // Malaysian Ringgit
        MZN: '🇲🇿', // Mozambican Metical
        NAD: '🇳🇦', // Namibian Dollar
        NGN: '🇳🇬', // Nigerian Naira
        NIO: '🇳🇮', // Nicaraguan Córdoba
        NOK: '🇳🇴', // Norwegian Krone
        NPR: '🇳🇵', // Nepalese Rupee
        NZD: '🇳🇿', // New Zealand Dollar
        OMR: '🇴🇲', // Omani Rial
        PAB: '🇵🇦', // Panamanian Balboa
        PEN: '🇵🇪', // Peruvian Nuevo Sol
        PGK: '🇵🇬', // Papua New Guinean Kina
        PHP: '🇵🇭', // Philippine Peso
        PKR: '🇵🇰', // Pakistani Rupee
        PLN: '🇵🇱', // Polish Zloty
        PYG: '🇵🇾', // Paraguayan Guarani
        QAR: '🇶🇦', // Qatari Rial
        RON: '🇷🇴', // Romanian Leu
        RSD: '🇷🇸', // Serbian Dinar
        RUB: '🇷🇺', // Russian Ruble
        RWF: '🇷🇼', // Rwandan Franc
        SAR: '🇸🇦', // Saudi Riyal
        SBD: '🇸🇧', // Solomon Islands Dollar
        SCR: '🇸🇨', // Seychellois Rupee
        SDG: '🇸🇩', // Sudanese Pound
        SEK: '🇸🇪', // Swedish Krona
        SGD: '🇸🇬', // Singapore Dollar
        SHP: '🇸🇭', // Saint Helena Pound
        SLL: '🇸🇱', // Sierra Leonean Leone
        SOS: '🇸🇴', // Somali Shilling
        SRD: '🇸🇷', // Surinamese Dollar
        SSP: '🇸🇸', // South Sudanese Pound
        STN: '🇸🇹', // São Tomé and Príncipe Dobra
        SYP: '🇸🇾', // Syrian Pound
        SZL: '🇸🇿', // Swazi Lilangeni
        THB: '🇹🇭', // Thai Baht
        TJS: '🇹🇯', // Tajikistani Somoni
        TMT: '🇹🇲', // Turkmenistani Manat
        TND: '🇹🇳', // Tunisian Dinar
        TOP: '🇹🇴', // Tongan Paʻanga
        TRY: '🇹🇷', // Turkish Lira
        TTD: '🇹🇹', // Trinidad and Tobago Dollar
        TWD: '🇹🇼', // New Taiwan Dollar
        TZS: '🇹🇿', // Tanzanian Shilling
        UAH: '🇺🇦', // Ukrainian Hryvnia
        UGX: '🇺🇬', // Ugandan Shilling
        USD: '🇺🇸', // United States Dollar
        UYU: '🇺🇾', // Uruguayan Peso
        UZS: '🇺🇿', // Uzbekistan Som
        VES: '🇻🇪', // Venezuelan Bolívar Soberano
        VND: '🇻🇳', // Vietnamese Dong
        VUV: '🇻🇺', // Vanuatu Vatu
        WST: '🇼🇸', // Samoan Tala
        XAF: '🌍', // CFA Franc BEAC (Central Africa)
        XCD: '🌎', // East Caribbean Dollar
        XOF: '🌍', // CFA Franc BCEAO (West Africa)
        XPF: '🇵🇫', // CFP Franc (French Polynesia/New Caledonia)
        YER: '🇾🇪', // Yemeni Rial
        ZAR: '🇿🇦', // South African Rand
        ZMW: '🇿🇲', // Zambian Kwacha
    };

    return currencyFlags[code] || '🏳️';
}
