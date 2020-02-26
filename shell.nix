with import <nixpkgs> {};
stdenv.mkDerivation rec {
  name = "dev";
  env = buildEnv {
    name = name;
    paths = buildInputs;
  };
  buildInputs = [
    nodejs-11_x
  ];
}
