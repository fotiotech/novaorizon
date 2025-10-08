// app/sitemap.xml/route.ts
"use server";
import axios from "axios";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { xml, error } = await axios
      .get("/api/sitemap")
      .then((res) => res.data);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, s-maxage=86400",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate sitemap index" },
      { status: 500 }
    );
  }
}
