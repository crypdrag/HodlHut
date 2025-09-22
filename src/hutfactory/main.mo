import Principal "mo:base/Principal";

actor HutFactory {

  // Hardcoded Plug wallet principal for testing
  // This is a valid principal format that can be used for initial testing
  private let HARDCODED_PLUG_PRINCIPAL = "rdmx6-jaaaa-aaaaa-aaadq-cai";

  // Static canister ID to return for the hardcoded user
  // In production, this would be dynamically created or looked up
  private let STATIC_HUT_CANISTER_ID = "rrkah-fqaaa-aaaaa-aaaaq-cai";

  // Main method to get a user's personal Hut canister
  public query func get_hut_for_user(user_principal: Principal) : async Principal {
    let user_id = Principal.toText(user_principal);

    // For now, only respond to our hardcoded Plug principal
    if (user_id == HARDCODED_PLUG_PRINCIPAL) {
      switch (Principal.fromText(STATIC_HUT_CANISTER_ID)) {
        case (?canister_principal) {
          return canister_principal;
        };
        case null {
          // Fallback to the hardcoded principal if parsing fails
          switch (Principal.fromText(HARDCODED_PLUG_PRINCIPAL)) {
            case (?fallback) { return fallback; };
            case null {
              // Last resort - return the anonymous principal
              return Principal.fromActor(HutFactory);
            };
          };
        };
      };
    } else {
      // For any other principal, return a placeholder indicating no Hut exists yet
      // In production, this would trigger Hut creation or return an error
      return Principal.fromActor(HutFactory);
    };
  };

  // Optional: Method to check if a user has a Hut assigned
  public query func has_hut(user_principal: Principal) : async Bool {
    let user_id = Principal.toText(user_principal);
    return user_id == HARDCODED_PLUG_PRINCIPAL;
  };

  // Optional: Method to get the hardcoded test principal (for testing purposes)
  public query func get_test_principal() : async Principal {
    switch (Principal.fromText(HARDCODED_PLUG_PRINCIPAL)) {
      case (?test_principal) { return test_principal; };
      case null { return Principal.fromActor(HutFactory); };
    };
  };

}