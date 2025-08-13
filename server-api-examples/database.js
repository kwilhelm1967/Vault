import supabase from "./supabase.js";

async function saveLicensesToDatabase(
  licenses,
  customerEmail,
  licenseType,
  orderId,
  status,
  paymentId = null
) {
  // Example with Supabase:

  for (const license of licenses) {
    const { data, error } = await supabase.from("licenses").insert([
      {
        license_key: license,
        license_type: licenseType,
        customer_email: customerEmail,
        status: status,
        order_id: orderId,
        created_at: new Date().toISOString(),
        payment_id: paymentId,
      },
    ]);

    if (error) {
      console.error("Error saving license:", error);
    } else {
      console.log("License saved:", data);
    }
  }
}

export { saveLicensesToDatabase };
