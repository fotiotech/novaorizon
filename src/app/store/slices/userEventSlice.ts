import { createUserEvents } from "@/app/actions/user_events";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export async function createUserEvent(data: any) {
  try {
    await createUserEvents(data);
  } catch (error: any) {
    console.error(error);
  }
}

interface UserEventState {
  events: Record<string, any>;
  eventIds: string[];
}

const initialState: UserEventState = {
  events: {},
  eventIds: [],
};

const userEventSlice = createSlice({
  name: "userEvent",
  initialState,
  reducers: {
    setUserEvents: (
      state,
      action: PayloadAction<{ events: Record<string, any>; eventIds: string[] }>
    ) => {
      state.events = action.payload.events;
      state.eventIds = action.payload.eventIds;
    },
    addEvent: (state, action: PayloadAction<any | null>) => {
      const { _id, ...eventData } = action.payload;

      // Validate eventId
      if (!_id) {
        console.error("Product ID is undefined. Payload:", action.payload);
        return;
      }

      // Validate eventsData
      if (!eventData || typeof eventData !== "object") {
        console.error(
          "Invalid product data. Skipping addProduct. Payload:",
          action.payload
        );
        return;
      }

      // Check if the event already exists in the state
      if (!state.events[_id]) {
        // If not, initialize the event in the state
        if (!state.eventIds.includes(_id)) {
          state.eventIds.push(_id); // Add the eventId to the allIds array
        }
        state.events[_id] = eventData;
      } else {
        // If the event exists, update its fields
        state.events[_id] = {
          ...state.events[_id],
          ...eventData,
        };
      }
    },
    removeEvent: (state, action: PayloadAction<string>) => {
      delete state.events[action.payload];
      state.eventIds = state.eventIds.filter((id) => id !== action.payload);
    },
    clearEvents: (state) => {
      state.events = {};
      state.eventIds = [];
    },
  },
});

export const { setUserEvents, addEvent, removeEvent, clearEvents } =
  userEventSlice.actions;

export default userEventSlice.reducer;
