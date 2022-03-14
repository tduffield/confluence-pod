/**
 * This is not an exhaustive list of types. Just enough to do proper type checking.
 */

export type ConfluenceContentSpace = {
  id: number,
  key: string,
  name: string,
  [x: string]: any,
};

export type ConfluenceContentVersion = {
  number: number,
  minorEdit?: boolean,
  [x: string]: any,
};

export type ConfluenceContentBodyObj = {
  value: string,
  representation: string,
  [x: string]: any,
};

export type ConfluenceContentBody = {
  [x: string]: ConfluenceContentBodyObj;
};

export type ConfluenceContent = {
  id: string,
  type: "page" | "blogpost" | "attachment" | "content";
  status: string,
  title: string,
  space?: ConfluenceContentSpace,
  version?: ConfluenceContentVersion,
  body?: ConfluenceContentBody,
  [x: string]: any,
};

export type ConfluenceContentArray = {
  results: ConfluenceContent[],
  [x: string]: any,
};
