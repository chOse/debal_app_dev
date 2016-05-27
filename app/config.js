(function() {
    var 
    config_data = {
        'GENERAL_CONFIG': {
            'APP_NAME': 'Debal',
            'RECREATE_APP_VERSIONS': ['1.0.0', '1.0.1', '1.0.2', '1.0.3', '1.1.8'],
            'APP_VERSION': '1.3.0',
            'CURR_RATES_URL' : "https://www.debal.fr/currency_rates",
            'API_URL': 'http://localhost:8888/debal_web/Apiv2/'
            //'API_URL': 'http://dev.debal.fr/Apiv2/'
        },
        
        'API_ROUTES':{
            sync: {
                url: "sync.json", type: "POST", auth: true
            },
            register: {
                url: "register.json", type: "POST"
            },
            auth: {
                url: "check.json", type: "GET"
            },
            send_feedback: {
                url: "send_feedback.json", type: "POST"
            },
            invite_user: {
                url: "invite_user.json", type: "POST", auth: true
            },
            edit_email: {
                url: "edit_email.json", type: "POST", auth: true
            },
            join_group: {
                url: "join_group.json", type: "POST", auth: true
            },
            handle_join_request: {
                url: "handle_join_request.json", type: "POST", auth: true
            },
            get_exchange_rates: {
                url: "get_exchange_rates.json", type: "GET", auth: true
            },
            facebook_connect: {
                url: "facebook_connect.json", type: "POST"
            },
            mangopay_register_card: {
                url: "mangopay_register_card.json", type: "GET", auth: true
            },
            mangopay_register_bankaccount: {
                url: "mangopay_register_bankaccount.json", type: "POST", auth: true
            },
            mangopay_process_group_payment: {
                url: "mangopay_process_group_payment.json", type: "POST", auth: true
            }
            
        },
        SUPPORTED_LANG : ["en","fr"],
        CURRENCIES_DEFAULT : "EUR",

        CURRENCIES_SYMBOLS : {
            ALL : "Lek",
            AFN : "؋",
            ARS : "$",
            AWG : "ƒ",
            AUD : "$",
            AZN : "ман",
            BSD : "$",
            BBD : "$",
            BYR : "p.",
            BZD : "BZ$",
            BMD : "$",
            BOB : "$b",
            BAM : "KM",
            BWP : "P",
            BGN : "лв",
            BRL : "R$",
            BND : "$",
            KHR : "៛",
            CAD : "$",
            KYD : "$",
            CLP : "$",
            CNY : "¥",
            COP : "$",
            CRC : "₡",
            HRK : "kn",
            CUP : "₱",
            CZK : "Kč",
            DKK : "kr",
            DOP : "RD$",
            XCD : "$",
            EGP : "£",
            SVC : "$",
            EEK : "kr",
            EUR : "€",
            FKP : "£",
            FJD : "$",
            GHC : "¢",
            GIP : "£",
            GTQ : "Q",
            GGP : "£",
            GYD : "$",
            HNL : "L",
            HKD : "$",
            HUF : "Ft",
            ISK : "kr",
            IDR : "Rp",
            IRR : "﷼",
            IMP : "£",
            ILS : "₪",
            JMD : "J$",
            JPY : "¥",
            JEP : "£",
            KZT : "лв",
            KPW : "₩",
            KRW : "₩",
            KGS : "лв",
            LAK : "₭",
            LVL : "Ls",
            LBP : "£",
            LRD : "$",
            LTL : "Lt",
            MKD : "ден",
            MYR : "RM",
            MUR : "₨",
            MXN : "$",
            MNT : "₮",
            MZN : "MT",
            NAD : "$",
            NPR : "₨",
            ANG : "ƒ",
            NZD : "$",
            NIO : "C$",
            NGN : "₦",
            NOK : "kr",
            OMR : "﷼",
            PKR : "₨",
            PAB : "B/.",
            PYG : "Gs",
            PEN : "S/.",
            PHP : "₱",
            PLN : "zł",
            QAR : "﷼",
            RON : "lei",
            RUB : "руб",
            SHP : "£",
            SAR : "﷼",
            RSD : "Дин.",
            SCR : "₨",
            SGD : "$",
            SBD : "$",
            SOS : "S",
            ZAR : "R",
            LKR : "₨",
            SEK : "kr",
            CHF : "CHF",
            SRD : "$",
            SYP : "£",
            TWD : "NT$",
            THB : "฿",
            TTD : "TT$",
            TRL : "₤",
            TVD : "$",
            UAH : "₴",
            GBP : "£",
            USD : "$",
            UYU : "$U",
            UZS : "лв",
            VEF : "Bs",
            VND : "₫",
            YER : "﷼",
            ZWD : "Z$",
        },

        CURRENCIES_LIST : {
            USD : {id: "USD", name_fr: "dollar des Etats-Unis (USD $)", name_en: "US Dollar (USD $)"},
            JPY : {id: "JPY", name_fr: "yen japonais (JPY ¥JP)", name_en: "Japanese Yen (JPY ¥)"},
            EUR : {id: "EUR", name_fr: "euro (EUR €)", name_en: "Euro (EUR €)"},
            GBP : {id: "GBP", name_fr: "livre sterling (GBP £GB)", name_en: "British Pound Sterling (GBP £)"},
            AUD : {id: "AUD", name_fr: "dollar australien (AUD $AU)", name_en: "Australian Dollar (AUD A$)"},
            KRW : {id: "KRW", name_fr: "won sud-coréen (KRW ₩)", name_en: "South Korean Won (KRW ₩)"},
            BRL : {id: "BRL", name_fr: "réal brésilien (BRL R$)", name_en: "Brazilian Real (BRL R$)"},
            CNY : {id: "CNY", name_fr: "yuan renminbi chinois (CNY ¥CN)", name_en: "Chinese Yuan (CNY CN¥)"},
            DKK : {id: "DKK", name_fr: "couronne danoise (DKK DKK)", name_en: "Danish Krone (DKK DKK)"},
            RUB : {id: "RUB", name_fr: "rouble russe (RUB RUB)", name_en: "Russian Ruble (RUB RUB)"},
            SEK : {id: "SEK", name_fr: "couronne suédoise (SEK SEK)", name_en: "Swedish Krona (SEK SEK)"},
            NOK : {id: "NOK", name_fr: "couronne norvégienne (NOK NOK)", name_en: "Norwegian Krone (NOK NOK)"},
            PLN : {id: "PLN", name_fr: "zloty polonais (PLN PLN)", name_en: "Polish Zloty (PLN PLN)"},
            TRY : {id: "TRY", name_fr: "livre turque (TRY TRY)", name_en: "Turkish Lira (TRY TRY)"},
            TWD : {id: "TWD", name_fr: "nouveau dollar taïwanais (TWD $TW)", name_en: "New Taiwan Dollar (TWD NT$)"},
            HKD : {id: "HKD", name_fr: "dollar de Hong Kong (HKD $HK)", name_en: "Hong Kong Dollar (HKD HK$)"},
            THB : {id: "THB", name_fr: "baht thaïlandais (THB ฿)", name_en: "Thai Baht (THB ฿)"},
            IDR : {id: "IDR", name_fr: "roupie indonésienne (IDR IDR)", name_en: "Indonesian Rupiah (IDR IDR)"},
            ARS : {id: "ARS", name_fr: "peso argentin (ARS $AR)", name_en: "Argentine Peso (ARS ARS)"},
            MXN : {id: "MXN", name_fr: "peso mexicain (MXN $MX)", name_en: "Mexican Peso (MXN MX$)"},
            VND : {id: "VND", name_fr: "dông vietnamien (VND ₫)", name_en: "Viet, name_ense Dong (VND ₫)"},
            PHP : {id: "PHP", name_fr: "peso philippin (PHP PHP)", name_en: "Philippine Peso (PHP Php)"},
            INR : {id: "INR", name_fr: "roupie indienne (INR Rs.)", name_en: "Indian Rupee (INR Rs.)"},
            CHF : {id: "CHF", name_fr: "franc suisse (CHF CHF)", name_en: "Swiss Franc (CHF CHF)"},
            CAD : {id: "CAD", name_fr: "dollar canadien (CAD $CA)", name_en: "Canadian Dollar (CAD CA$)"},
            CZK : {id: "CZK", name_fr: "couronne tchèque (CZK CZK)", name_en: "Czech Republic Koruna (CZK CZK)"},
            NZD : {id: "NZD", name_fr: "dollar néo-zélandais (NZD $NZ)", name_en: "New Zealand Dollar (NZD NZ$)"},
            HUF : {id: "HUF", name_fr: "forint hongrois (HUF HUF)", name_en: "Hungarian Forint (HUF HUF)"},
            BGN : {id: "BGN", name_fr: "lev bulgare (BGN BGN)", name_en: "Bulgarian Lev (BGN BGN)"},
            LTL : {id: "LTL", name_fr: "litas lituanien (LTL LTL)", name_en: "Lithuanian Litas (LTL LTL)"},
            ZAR : {id: "ZAR", name_fr: "rand sud-africain (ZAR ZAR)", name_en: "South African Rand (ZAR ZAR)"},
            UAH : {id: "UAH", name_fr: "hryvnia ukrainienne (UAH UAH)", name_en: "Ukrainian Hryvnia (UAH UAH)"},
            AED : {id: "AED", name_fr: "dirham des Émirats arabes unis (AED AED)", name_en: "United Arab Emirates Dirham (AED AED)"},
            BOB : {id: "BOB", name_fr: "boliviano bolivien (BOB BOB)", name_en: "Bolivian Boliviano (BOB BOB)"},
            CLP : {id: "CLP", name_fr: "peso chilien (CLP $CL)", name_en: "Chilean Peso (CLP CLP)"},
            COP : {id: "COP", name_fr: "peso colombien (COP $CO)", name_en: "Colombian Peso (COP COP)"},
            EGP : {id: "EGP", name_fr: "livre égyptienne (EGP £EG)", name_en: "Egyptian Pound (EGP EGP)"},
            HRK : {id: "HRK", name_fr: "kuna croate (HRK HRK)", name_en: "Croatian Kuna (HRK HRK)"},
            ILS : {id: "ILS", name_fr: "nouveau shekel israélien (ILS ₪)", name_en: "Israeli New Sheqel (ILS ₪)"},
            MAD : {id: "MAD", name_fr: "dirham marocain (MAD MAD)", name_en: "Moroccan Dirham (MAD MAD)"},
            MYR : {id: "MYR", name_fr: "ringgit malais (MYR MYR)", name_en: "Malaysian Ringgit (MYR MYR)"},
            PEN : {id: "PEN", name_fr: "nouveau sol péruvien (PEN PEN)", name_en: "Peruvian Nuevo Sol (PEN PEN)"},
            PKR : {id: "PKR", name_fr: "roupie pakistanaise (PKR PKR)", name_en: "Pakistani Rupee (PKR PKR)"},
            RON : {id: "RON", name_fr: "leu roumain (RON RON)", name_en: "Romanian Leu (RON RON)"},
            RSD : {id: "RSD", name_fr: "dinar serbe (RSD RSD)", name_en: "Serbian Dinar (RSD RSD)"},
            SAR : {id: "SAR", name_fr: "rial saoudien (SAR SAR)", name_en: "Saudi Riyal (SAR SAR)"},
            SGD : {id: "SGD", name_fr: "dollar de Singapour (SGD $SG)", name_en: "Singapore Dollar (SGD SGD)"},
            VEF : {id: "VEF", name_fr: "bolivar vénézuélien (VEF VEF)", name_en: "Venezuelan Bolívar (VEF VEF)"},
            LVL : {id: "LVL", name_fr: "lats letton (LVL LVL)", name_en: "Latvian Lats (LVL LVL)"},
        }
    },
    config_module = angular.module('Debal.config', []);
    
    angular.forEach(config_data, function(key, value) {
        config_module.constant(value, key);
    });
    
}());