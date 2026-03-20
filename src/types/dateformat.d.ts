declare module "dateformat" {
  function dateFormat(
    date: Date | string | number,
    mask?: string,
    utc?: boolean,
    gmt?: boolean
  ): string;

  export default dateFormat;
}
