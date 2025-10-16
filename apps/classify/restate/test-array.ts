import { SQL, sql } from "bun";

const testArray = ["foo", "bar", "baz"];
console.log("sql.array() output:", sql.array(testArray));
