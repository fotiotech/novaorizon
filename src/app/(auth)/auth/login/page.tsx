import { redirect } from "next/navigation";
import { signIn, auth, providerMap } from "@/app/auth";
import { AuthError } from "next-auth";
import Link from "next/link";

const SIGNIN_ERROR_URL = "/auth/error";

export default async function SignInPage(props: {
  searchParams: { callbackUrl: string | undefined };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-semibold text-gray-800">
          Sign In
        </h1>
        <form
          action={async (formData) => {
            "use server";
            try {
              await signIn("credentials", formData);
            } catch (error) {
              if (error instanceof AuthError) {
                return redirect(`${SIGNIN_ERROR_URL}?error=${error.type}`);
              }
              throw error;
            }
          }}
          className="space-y-6"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              name="email"
              id="email"
              type="email"
              className="w-full rounded-xl border border-gray-300 p-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              name="password"
              id="password"
              type="password"
              className="w-full rounded-xl border border-gray-300 p-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <input
            type="submit"
            value="Sign In"
            className="w-full cursor-pointer rounded-xl bg-blue-600 p-3 text-white font-medium transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-center text-sm text-gray-600">
            Don\'t have an account?{' '}
            <Link href="/auth/sign_up" className="font-medium text-blue-600 hover:underline">
              Sign Up
            </Link>
          </p>
        </form>
        <div className="mt-8 space-y-4">
          {Object.values(providerMap).map((provider) => (
            <form
              key={provider.id}
              action={async () => {
                "use server";
                try {
                  await signIn(provider.id, {
                    redirectTo: props.searchParams?.callbackUrl ?? "",
                  });
                } catch (error) {
                  if (error instanceof AuthError) {
                    return redirect(`${SIGNIN_ERROR_URL}?error=${error.type}`);
                  }
                  throw error;
                }
              }}
            >
              <button
                type="submit"
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-medium shadow-sm transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Sign in with {provider.name}
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
