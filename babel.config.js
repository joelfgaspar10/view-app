module.exports = function (api) {
  api.cache(true);
  return {
    // NativeWind provides a Babel preset (not a plugin)
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // react-native-worklets/plugin is already included by the NativeWind preset
    plugins: [],
  };
};

// module.exports = function (api) {
//   api.cache(true);
//   return {
//     presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
//     plugins: ["react-native-worklets/plugin"], // if you prefer explicitly listing it
//   };
// };
