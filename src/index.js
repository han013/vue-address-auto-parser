import AddressAutoParser from "./components/AddressAutoParser.vue";
import { parseCnAddress, parseCnAddressAsync, buildDivisionTree } from "./utils/cn-address-parser";
import { getRegionBaseData } from "./data/region-loader";

const AddressAutoParserPlugin = {
  install(app) {
    app.component("AddressAutoParser", AddressAutoParser);
  },
};

AddressAutoParser.install = (app) => {
  app.component("AddressAutoParser", AddressAutoParser);
};

export {
  AddressAutoParser,
  AddressAutoParserPlugin,
  parseCnAddress,
  parseCnAddressAsync,
  buildDivisionTree,
  getRegionBaseData,
};
export default parseCnAddressAsync;
