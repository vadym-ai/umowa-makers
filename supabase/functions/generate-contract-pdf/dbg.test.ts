import { renderContractPdf } from "./render.ts";
Deno.test("dump", async () => {
  const bytes = await renderContractPdf({number:"1/07/2026",data:{startDate:"2026-07-01",endDate:"2026-07-31",city:"Warszawa",paymentDays:3,subject:"opracowaniu grafik",amountNet:2800,company:{name:"Firma"},contractor:{full_name:"Michał"}}} as never);
  const raw = new TextDecoder("latin1").decode(bytes);
  const i = raw.indexOf("BT");
  console.log(JSON.stringify(raw.slice(i, i+400)));
});
