import Principal "mo:core/Principal";

module {
  public func isAdmin(caller : Principal, admins : [Principal]) : Bool {
    for (admin in admins.vals()) {
      if (Principal.equal(admin, caller)) {
        return true;
      };
    };
    false
  };
}
