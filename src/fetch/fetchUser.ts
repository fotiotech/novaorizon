import { fetchUserEvent } from "@/app/actions/user_events";
import { normalizeUserEvent } from "@/app/store/slices/normalizedData";
import { setUserEvents } from "@/app/store/slices/userEventSlice";
import { AppDispatch } from "@/app/store/store";

export const fetchUserEvents =
  (userId?: string, eventType?: string, limit?: number) =>
  async (dispatch: AppDispatch) => {
    try {
      let data;

      // Fetch user data based on the presence of an ID
      if (userId && eventType) {
        data = await fetchUserEvent(userId, eventType, limit);
      }

      console.log("Fetched user data:", data);

      // Check if data is empty or undefined
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.error("No users found");
        return;
      }

      // Normalize the data
      const normalizedData = normalizeUserEvent(
        Array.isArray(data) ? data : [data]
      );
      console.log("Normalized user data:", normalizedData);

      // Dispatch normalized data to the store
      dispatch(
        setUserEvents({
          events: normalizedData.entities.events || {},
          eventIds: Object.keys(normalizedData.entities.events || {}),
        })
      );

      console.log("Users successfully dispatched to Redux store.");
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error; // Optionally rethrow the error
    }
  };
