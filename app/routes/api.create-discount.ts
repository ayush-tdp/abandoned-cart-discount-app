import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: { request: Request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const body = await request.json();
    const customerName = body.customerName || "Customer";

    // Create a unique code (Name + Timestamp)
    const code = `${customerName}-${Date.now().toString(36)}`.toUpperCase();

    // Create discount valid for 24 hours
    const response = await admin.graphql(
      `#graphql
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode {
            codeDiscount {
              ... on DiscountCodeBasic {
                code
                title
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          basicCodeDiscount: {
            title: `Abandoned Cart - ${customerName}`,
            code,
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            customerSelection: { all: true },
            customerGets: {
              value: { discountPercentage: { percentage: 10 } },
              items: { all: true },
            },
          },
        },
      }
    );

    const result = await response.json();
    return json({ code, result });
  } catch (error: any) {
    console.error(error);
    return json({ error: error.message }, { status: 500 });
  }
};
