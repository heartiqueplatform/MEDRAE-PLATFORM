export type InstitutionOption = {
    value: string;
    label: string;
    tag?: "kmtc" | "university" | "hospital" | "other";
};

export const institutions: InstitutionOption[] = [
    // KMTC
    { value: "kmtc_amboseli", label: "KMTC Amboseli", tag: "kmtc" },
    { value: "kmtc_bomet", label: "KMTC Bomet", tag: "kmtc" },
    { value: "kmtc_busia", label: "KMTC Busia", tag: "kmtc" },
    { value: "kmtc_eldoret", label: "KMTC Eldoret", tag: "kmtc" },
    { value: "kmtc_embu", label: "KMTC Embu", tag: "kmtc" },
    { value: "kmtc_garissa", label: "KMTC Garissa", tag: "kmtc" },
    { value: "kmtc_homa_bay", label: "KMTC Homa Bay", tag: "kmtc" },
    { value: "kmtc_kakamega", label: "KMTC Kakamega", tag: "kmtc" },
    { value: "kmtc_kajiado", label: "KMTC Kajiado", tag: "kmtc" },
    { value: "kmtc_kamulu", label: "KMTC Kamulu", tag: "kmtc" },
    { value: "kmtc_kericho", label: "KMTC Kericho", tag: "kmtc" },
    { value: "kmtc_kilifi", label: "KMTC Kilifi", tag: "kmtc" },
    { value: "kmtc_kitui", label: "KMTC Kitui", tag: "kmtc" },
    { value: "kmtc_kisii", label: "KMTC Kisii", tag: "kmtc" },
    { value: "kmtc_kisumu", label: "KMTC Kisumu", tag: "kmtc" },
    { value: "kmtc_kitale", label: "KMTC Kitale", tag: "kmtc" },
    { value: "kmtc_koibatek", label: "KMTC Koibatek", tag: "kmtc" },
    { value: "kmtc_kuresoi", label: "KMTC Kuresoi", tag: "kmtc" },
    { value: "kmtc_lamu", label: "KMTC Lamu", tag: "kmtc" },
    { value: "kmtc_malindi", label: "KMTC Malindi", tag: "kmtc" },
    { value: "kmtc_marsabit", label: "KMTC Marsabit", tag: "kmtc" },
    { value: "kmtc_meru", label: "KMTC Meru", tag: "kmtc" },
    { value: "kmtc_migori", label: "KMTC Migori", tag: "kmtc" },
    { value: "kmtc_mombasa", label: "KMTC Mombasa", tag: "kmtc" },
    { value: "kmtc_muranga", label: "KMTC Murang'a", tag: "kmtc" },
    { value: "kmtc_nairobi", label: "KMTC Nairobi", tag: "kmtc" },
    { value: "kmtc_nakuru", label: "KMTC Nakuru", tag: "kmtc" },
    { value: "kmtc_nandi", label: "KMTC Nandi", tag: "kmtc" },
    { value: "kmtc_narok", label: "KMTC Narok", tag: "kmtc" },
    { value: "kmtc_nyandarua", label: "KMTC Nyandarua", tag: "kmtc" },
    { value: "kmtc_nyeri", label: "KMTC Nyeri", tag: "kmtc" },
    { value: "kmtc_samburu", label: "KMTC Samburu", tag: "kmtc" },
    { value: "kmtc_sotik", label: "KMTC Sotik", tag: "kmtc" },
    { value: "kmtc_thika", label: "KMTC Thika", tag: "kmtc" },
    { value: "kmtc_trans_nzoia", label: "KMTC Trans Nzoia", tag: "kmtc" },
    { value: "kmtc_ujiji", label: "KMTC Ujiji", tag: "kmtc" },
    { value: "kmtc_uar", label: "KMTC Uasin Gishu", tag: "kmtc" },

    // Nursing schools
    { value: "fidenza_kyeni", label: "Fidenza School of Nursing Kyeni", tag: "hospital" },
    { value: "consolata_kyeni", label: "Consolata Hospital Kyeni", tag: "hospital" },

    // Universities
    { value: "kenyatta_university", label: "Kenyatta University", tag: "university" },
    { value: "mount_kenya_university", label: "Mount Kenya University", tag: "university" },
    { value: "university_of_nairobi", label: "University of Nairobi", tag: "university" },
    { value: "strathmore_university", label: "Strathmore University", tag: "university" },

    // Others
    { value: "private_nursing_school", label: "Private Nursing School", tag: "other" },
    { value: "other", label: "Other", tag: "other" },
];

export const counties = [
    { value: "mombasa", label: "Mombasa" },
    { value: "kwale", label: "Kwale" },
    { value: "kilifi", label: "Kilifi" },
    { value: "tana-river", label: "Tana River" },
    { value: "lamu", label: "Lamu" },
    { value: "taita-taveta", label: "Taita-Taveta" },

    { value: "garissa", label: "Garissa" },
    { value: "wajir", label: "Wajir" },
    { value: "mandera", label: "Mandera" },
    { value: "marsabit", label: "Marsabit" },
    { value: "isiolo", label: "Isiolo" },
    { value: "meru", label: "Meru" },
    { value: "tharaka-nithi", label: "Tharaka-Nithi" },
    { value: "embu", label: "Embu" },
    { value: "kitui", label: "Kitui" },
    { value: "machakos", label: "Machakos" },
    { value: "makueni", label: "Makueni" },

    { value: "nyandarua", label: "Nyandarua" },
    { value: "nyeri", label: "Nyeri" },
    { value: "kirinyaga", label: "Kirinyaga" },
    { value: "muranga", label: "Murang'a" },
    { value: "kiambu", label: "Kiambu" },

    { value: "turkana", label: "Turkana" },
    { value: "west-pokot", label: "West Pokot" },
    { value: "samburu", label: "Samburu" },
    { value: "trans-nzoia", label: "Trans Nzoia" },
    { value: "uasin-gishu", label: "Uasin Gishu" },
    { value: "elgeyo-marakwet", label: "Elgeyo Marakwet" },
    { value: "nandi", label: "Nandi" },
    { value: "bomet", label: "Bomet" },
    { value: "kericho", label: "Kericho" },

    { value: "kakamega", label: "Kakamega" },
    { value: "vihiga", label: "Vihiga" },
    { value: "bungoma", label: "Bungoma" },
    { value: "busia", label: "Busia" },

    { value: "siaya", label: "Siaya" },
    { value: "kisumu", label: "Kisumu" },
    { value: "homabay", label: "Homa Bay" },
    { value: "migori", label: "Migori" },
    { value: "kisii", label: "Kisii" },
    { value: "nyamira", label: "Nyamira" },

    { value: "nairobi", label: "Nairobi" },
    { value: "other", label: "Other" },
];